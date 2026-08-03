#!/usr/bin/env bash
# Build toàn bộ ChillNet: install 2 shared lib, package 10 service Java, dựng venv cho ai-service (Python).
# Yêu cầu: JDK 17. Nếu không có `mvn` trong PATH, script dùng mvnw của post-service cho shared libs.
set -euo pipefail
cd "$(dirname "$0")/.."

# Nạp .env nếu có (chủ yếu để lấy JAVA_HOME khi máy không có Java hệ thống).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  PATH="$JAVA_HOME/bin:$PATH"
fi

# Shared libs không có mvnw wrapper — ưu tiên mvn, fallback sang wrapper của post-service.
MVN="mvn"
if ! command -v mvn >/dev/null 2>&1; then
  MVN="$(pwd)/post-service/mvnw"
fi

for lib in shared-common shared-contacts; do
  echo "==> install $lib"
  (cd "$lib" && "$MVN" -q clean install -DskipTests)
done

SERVICES=(api-gateway identity-service profile-service notification-service post-service \
  file-service chat-service social-service interaction-service group-service)
for svc in "${SERVICES[@]}"; do
  echo "==> package $svc"
  chmod +x "$svc/mvnw" 2>/dev/null || true
  (cd "$svc" && ./mvnw -q clean package -DskipTests)
done

# ai-service là Python (FastAPI) — dựng virtualenv + cài deps (bỏ qua nếu không có python3).
if command -v python3 >/dev/null 2>&1; then
  echo "==> setup ai-service (python venv)"
  python3 -m venv ai-service/.venv
  ai-service/.venv/bin/pip -q install --upgrade pip
  ai-service/.venv/bin/pip -q install -r ai-service/requirements.txt
else
  echo "!! Bỏ qua ai-service: không tìm thấy python3." >&2
fi

echo "==> Build xong toàn bộ."
