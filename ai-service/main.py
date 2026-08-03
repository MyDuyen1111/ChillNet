"""ChillNet AI Service — kiểm duyệt nội dung bằng LLM (OpenAI-compatible).

Service Python/FastAPI độc lập trong kiến trúc microservice của ChillNet.
Giữ đúng contract với các service Java: mọi route nằm dưới prefix `/ai` (khớp
context-path cũ), trả về envelope `ApiResponse {code, message, result}`.

- POST /ai/internal/moderations/moderate  — service-to-service (post/interaction gọi qua Feign)
- POST /ai/moderations/check               — qua gateway (frontend kiểm tra trước khi đăng)

Fail-open hoàn toàn: thiếu key hoặc LLM lỗi thì KHÔNG chặn (trả flagged=false),
giống cách Brevo/Cloudinary degrade trong repo này.
"""

import json
import logging
import os
from typing import List, Optional

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [ai-service] %(message)s")
logger = logging.getLogger("ai-service")

OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT_MS", "15000")) / 1000.0

app = FastAPI(title="ChillNet AI Service", version="0.1.0")


# ----- DTO (khớp com.tien.*.dto.ModerationRequest/Response + ApiResponse) -----
class ModerationRequest(BaseModel):
    text: Optional[str] = None
    context: Optional[str] = None  # "POST" | "COMMENT"


class ModerationResult(BaseModel):
    flagged: bool = False
    severity: str = "NONE"  # NONE | LOW | MEDIUM | HIGH
    categories: List[str] = []
    reason: str = ""


def api_response(result: dict) -> dict:
    # Mirror ApiResponse { int code=1000, String message, T result }.
    return {"code": 1000, "message": None, "result": result}


SYSTEM_PROMPT = (
    "Bạn là bộ kiểm duyệt nội dung cho một mạng xã hội tiếng Việt. "
    "Phân loại văn bản người dùng theo các nhóm vi phạm: quấy rối, thù ghét, "
    "khiêu dâm, bạo lực, spam, tự hại. CHỈ trả về JSON đúng định dạng sau, "
    "không thêm bất kỳ chữ nào khác:\n"
    '{"flagged": true/false, "severity": "NONE|LOW|MEDIUM|HIGH", '
    '"categories": [danh sách nhãn tiếng Việt], "reason": "giải thích ngắn tiếng Việt"}\n'
    "Dùng severity=HIGH cho nội dung nghiêm trọng (đe dọa, kích động bạo lực, "
    "thù ghét nặng, khiêu dâm rõ ràng). Nội dung bình thường: flagged=false, "
    "severity=NONE, categories=[]."
)


def _fail_open(reason: str) -> ModerationResult:
    return ModerationResult(flagged=False, severity="NONE", categories=[], reason=reason)


def _extract_json(text: str) -> dict:
    """Lấy object JSON đầu tiên trong reply (lenient: nhiều endpoint bọc thêm chữ/```)."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Reply không chứa JSON object")
    return json.loads(text[start : end + 1])


async def moderate_text(req: ModerationRequest) -> ModerationResult:
    text = (req.text or "").strip()
    if not text:
        return _fail_open("Nội dung rỗng")
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY chưa cấu hình — bỏ qua kiểm duyệt (fail-open).")
        return _fail_open("AI moderation disabled")

    payload = {
        "model": OPENAI_MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=OPENAI_TIMEOUT) as client:
            resp = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json=payload,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        data = _extract_json(content)
        return ModerationResult(
            flagged=bool(data.get("flagged", False)),
            severity=str(data.get("severity", "NONE")).upper(),
            categories=list(data.get("categories") or []),
            reason=str(data.get("reason") or ""),
        )
    except Exception as exc:  # noqa: BLE001 — fail-open trên MỌI lỗi, không được ném ra caller
        logger.error("Kiểm duyệt AI thất bại — fail-open (coi như không vi phạm): %s", exc)
        return _fail_open("AI moderation unavailable")


@app.get("/ai/actuator/health")
async def health() -> dict:
    return {"status": "UP", "model": OPENAI_MODEL, "configured": bool(OPENAI_API_KEY)}


@app.post("/ai/internal/moderations/moderate")
async def moderate_internal(req: ModerationRequest) -> dict:
    result = await moderate_text(req)
    return api_response(result.model_dump())


@app.post("/ai/moderations/check")
async def moderate_check(req: ModerationRequest) -> dict:
    result = await moderate_text(req)
    return api_response(result.model_dump())
