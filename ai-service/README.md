# ai-service (Python / FastAPI)

Service kiểm duyệt nội dung của ChillNet. **Không phải Spring Boot** — đây là service Python độc lập (polyglot microservice), gọi một LLM tương thích OpenAI.

- Port **8090**, mọi route dưới prefix **`/ai`** (khớp context-path cũ nên gateway/Feign không phải đổi).
- `POST /ai/internal/moderations/moderate` — service-to-service (post/interaction gọi qua Feign).
- `POST /ai/moderations/check` — qua gateway (frontend kiểm tra trước khi đăng).
- `GET  /ai/actuator/health`.

Trả về envelope giống Java: `{"code":1000,"result":{"flagged":bool,"severity":"NONE|LOW|MEDIUM|HIGH","categories":[...],"reason":"..."}}`.

## Cấu hình (env, lấy từ `.env` ở gốc repo)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Endpoint OpenAI-compatible |
| `OPENAI_API_KEY` | *(trống)* | Trống = **fail-open**, bỏ qua kiểm duyệt |
| `OPENAI_MODEL` | `gpt-4o-mini` | Tên model (đúng như `GET {base}/models` trả về) |
| `OPENAI_TIMEOUT_MS` | `15000` | Timeout gọi LLM |

**Fail-open:** thiếu key hoặc LLM lỗi → trả `flagged=false` (không chặn), chỉ log.

## Chạy

`scripts/build-all.sh` tự tạo venv + cài deps; `scripts/run-all.sh` tự chạy bằng uvicorn.
Chạy tay:

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8090
```
