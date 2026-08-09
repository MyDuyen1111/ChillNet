#!/usr/bin/env bash
# Khoi dong toan bo ChillNet tren may dev: local infra, backend/AI va frontend.
#
#   scripts/start-all.sh          # chi build khi thieu hoac source moi hon JAR
#   scripts/start-all.sh --build  # ep build lai backend va kiem tra frontend
set -Eeuo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

FORCE_BUILD=false

usage() {
  printf '%s\n' \
    "Khoi dong toan bo ChillNet tren may dev." \
    "" \
    "  scripts/start-all.sh          # tu build khi can" \
    "  scripts/start-all.sh --build  # ep build lai backend va frontend"
}

case "${1:-}" in
  "") ;;
  --build) FORCE_BUILD=true ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    echo "!! Tham so khong hop le: $1 (dung --build hoac --help)" >&2
    exit 2
    ;;
esac

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  PATH="$JAVA_HOME/bin:$PATH"
fi

RUNTIME_BIN="$ROOT/.runtime/bin"
DATA_ROOT="$ROOT/.runtime-data"
LOG_ROOT="$ROOT/logs"
PID_ROOT="$LOG_ROOT/pids"
mkdir -p "$LOG_ROOT" "$PID_ROOT"

SERVICES=(api-gateway identity-service profile-service notification-service post-service \
  file-service chat-service social-service interaction-service group-service moderation-service)
FRONTEND_PORT="${FRONTEND_PORT:-5174}"
API_GATEWAY_PORT="${API_GATEWAY_PORT:-8080}"
IDENTITY_SERVICE_PORT="${IDENTITY_SERVICE_PORT:-8081}"
PROFILE_SERVICE_PORT="${PROFILE_SERVICE_PORT:-8082}"
NOTIFICATION_SERVICE_PORT="${NOTIFICATION_SERVICE_PORT:-8083}"
POST_SERVICE_PORT="${POST_SERVICE_PORT:-8084}"
FILE_SERVICE_PORT="${FILE_SERVICE_PORT:-8085}"
CHAT_SERVICE_PORT="${CHAT_SERVICE_PORT:-8086}"
SOCIAL_SERVICE_PORT="${SOCIAL_SERVICE_PORT:-8087}"
INTERACTION_SERVICE_PORT="${INTERACTION_SERVICE_PORT:-8088}"
GROUP_SERVICE_PORT="${GROUP_SERVICE_PORT:-8089}"
AI_SERVICE_PORT="${AI_SERVICE_PORT:-8090}"
MODERATION_SERVICE_PORT="${MODERATION_SERVICE_PORT:-8091}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MONGODB_PORT="${MONGODB_PORT:-27018}"
MINIO_API_PORT="${MINIO_API_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
BACKEND_PORTS=(
  "$API_GATEWAY_PORT" "$IDENTITY_SERVICE_PORT" "$PROFILE_SERVICE_PORT"
  "$NOTIFICATION_SERVICE_PORT" "$POST_SERVICE_PORT" "$FILE_SERVICE_PORT"
  "$CHAT_SERVICE_PORT" "$SOCIAL_SERVICE_PORT" "$INTERACTION_SERVICE_PORT"
  "$GROUP_SERVICE_PORT" "$AI_SERVICE_PORT" "$MODERATION_SERVICE_PORT"
)

fail() {
  echo "!! $*" >&2
  exit 1
}

port_open() {
  (echo > /dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1
}

wait_port() {
  local name=$1 port=$2 log_file=$3 tries=${4:-60}
  until port_open "$port"; do
    tries=$((tries - 1))
    if [ "$tries" -le 0 ]; then
      echo "!! $name khong len duoc port $port -- xem $log_file" >&2
      tail -80 "$log_file" 2>/dev/null || true
      return 1
    fi
    sleep 1
  done
  echo "    $name OK (:$port)"
}

require_exec() {
  [ -x "$1" ] || fail "Thieu executable $1 -- moi truong local chua duoc cai day du."
}

jar_for() {
  find "$1/target" -maxdepth 1 -type f -name '*.jar' ! -name '*.original' -print -quit 2>/dev/null
}

backend_needs_build() {
  local module jar newer shared_jar service_jar
  local modules=(shared-common shared-contacts "${SERVICES[@]}")

  for module in "${modules[@]}"; do
    jar=$(jar_for "$module")
    [ -n "$jar" ] || return 0
    newer=$(find "$module/src" "$module/pom.xml" -type f -newer "$jar" -print -quit 2>/dev/null || true)
    [ -z "$newer" ] || return 0
  done

  # Shared classes are bundled into service fat JARs, so a newer shared JAR
  # requires repackaging every Java service even when its own source is unchanged.
  for module in shared-common shared-contacts; do
    shared_jar=$(jar_for "$module")
    for service in "${SERVICES[@]}"; do
      service_jar=$(jar_for "$service")
      [ ! "$shared_jar" -nt "$service_jar" ] || return 0
    done
  done

  [ -x ai-service/.venv/bin/python ] || return 0
  return 1
}

ensure_build() {
  if "$FORCE_BUILD" || backend_needs_build; then
    echo "==> build backend + ai-service"
    scripts/build-all.sh
  else
    echo "==> backend artifacts da cap nhat (dung --build de ep build lai)"
  fi
}

ensure_frontend_deps() {
  command -v npm >/dev/null 2>&1 || fail "Khong tim thay npm trong PATH/JAVA_HOME/bin."
  if [ ! -x frontend/node_modules/.bin/vite ] \
    || [ frontend/package-lock.json -nt frontend/node_modules/.package-lock.json ]; then
    echo "==> install frontend dependencies"
    (cd frontend && npm ci)
  else
    echo "==> frontend dependencies da san sang"
  fi

  if "$FORCE_BUILD"; then
    echo "==> verify frontend production build"
    (cd frontend && npm run build)
  fi
}

check_application_ports() {
  local port running=0
  for port in "${BACKEND_PORTS[@]}"; do
    port_open "$port" && running=$((running + 1))
  done

  if [ "$running" -eq "${#BACKEND_PORTS[@]}" ]; then
    if "$FORCE_BUILD"; then
      fail "Stack dang chay. Hay dung scripts/stop-all.sh truoc khi chay lai voi --build."
    fi
    if port_open "$FRONTEND_PORT"; then
      echo "==> ChillNet da chay day du."
      print_urls
      exit 0
    fi
    echo "==> Backend da chay; se chi khoi dong frontend."
    ensure_frontend_deps
    start_frontend
    print_urls
    exit 0
  fi

  if [ "$running" -gt 0 ] || port_open "$FRONTEND_PORT"; then
    fail "Stack dang chay do dang. Hay chay scripts/stop-all.sh roi thu lai."
  fi
}

start_mysql() {
  if port_open "$MYSQL_PORT"; then
    echo "==> MySQL da chay san (:$MYSQL_PORT)"
    return
  fi

  require_exec "$RUNTIME_BIN/mysqld"
  [ -f "$DATA_ROOT/mysql/ibdata1" ] \
    || fail "Chua co MySQL data tai $DATA_ROOT/mysql. Can khoi tao moi truong truoc."
  rm -f "$PID_ROOT/mysql.pid" /tmp/chillnet-mysql.sock

  echo "==> start mysql (:$MYSQL_PORT)"
  nohup "$RUNTIME_BIN/mysqld" --no-defaults \
    --basedir="$ROOT/.runtime" --datadir="$DATA_ROOT/mysql" \
    --port="$MYSQL_PORT" --bind-address=127.0.0.1 --mysqlx=OFF \
    --socket=/tmp/chillnet-mysql.sock --pid-file="$PID_ROOT/mysql.pid" \
    --log-error="$LOG_ROOT/mysql.log" --innodb-buffer-pool-size=256M \
    >/dev/null 2>&1 &
  echo $! > "$PID_ROOT/mysql.pid"
  wait_port mysql "$MYSQL_PORT" "$LOG_ROOT/mysql.log"
}

start_mongodb() {
  if port_open "$MONGODB_PORT"; then
    echo "==> MongoDB da chay san (:$MONGODB_PORT)"
    return
  fi

  require_exec "$RUNTIME_BIN/mongod"
  [ -f "$DATA_ROOT/mongo/WiredTiger" ] \
    || fail "Chua co MongoDB data tai $DATA_ROOT/mongo. Can khoi tao moi truong truoc."
  rm -f "$PID_ROOT/mongodb.pid"

  echo "==> start mongodb (:$MONGODB_PORT)"
  nohup "$RUNTIME_BIN/mongod" --dbpath "$DATA_ROOT/mongo" \
    --port "$MONGODB_PORT" --bind_ip 127.0.0.1 --auth --nounixsocket \
    --pidfilepath "$PID_ROOT/mongodb.pid" --logpath "$LOG_ROOT/mongodb.log" \
    --wiredTigerCacheSizeGB 0.5 >/dev/null 2>&1 &
  echo $! > "$PID_ROOT/mongodb.pid"
  wait_port mongodb "$MONGODB_PORT" "$LOG_ROOT/mongodb.log"
}

start_minio() {
  if port_open "$MINIO_API_PORT" && port_open "$MINIO_CONSOLE_PORT"; then
    echo "==> MinIO da chay san (:$MINIO_API_PORT/:$MINIO_CONSOLE_PORT)"
    return
  fi
  if port_open "$MINIO_API_PORT" || port_open "$MINIO_CONSOLE_PORT"; then
    fail "MinIO dang chay do dang: can trong ca hai port $MINIO_API_PORT va $MINIO_CONSOLE_PORT."
  fi

  require_exec "$RUNTIME_BIN/minio"
  mkdir -p "$DATA_ROOT/minio"
  rm -f "$PID_ROOT/minio.pid"

  echo "==> start minio (API :$MINIO_API_PORT, console :$MINIO_CONSOLE_PORT)"
  MINIO_ROOT_USER="${MINIO_ACCESS_KEY:-chillnet}" \
  MINIO_ROOT_PASSWORD="${MINIO_SECRET_KEY:-chillnet814362}" \
    nohup "$RUNTIME_BIN/minio" server "$DATA_ROOT/minio" \
      --address "127.0.0.1:$MINIO_API_PORT" --console-address "127.0.0.1:$MINIO_CONSOLE_PORT" \
      > "$LOG_ROOT/minio.log" 2>&1 &
  echo $! > "$PID_ROOT/minio.pid"
  wait_port minio-api "$MINIO_API_PORT" "$LOG_ROOT/minio.log"
  wait_port minio-console "$MINIO_CONSOLE_PORT" "$LOG_ROOT/minio.log"
}

start_frontend() {
  if port_open "$FRONTEND_PORT"; then
    echo "==> Frontend da chay san (:$FRONTEND_PORT)"
    return
  fi

  local node_bin
  node_bin=$(command -v node || true)
  [ -n "$node_bin" ] || fail "Khong tim thay node trong PATH/JAVA_HOME/bin."
  rm -f "$PID_ROOT/frontend.pid"

  echo "==> start frontend (:$FRONTEND_PORT)"
  (
    cd frontend
    exec nohup "$node_bin" node_modules/vite/bin/vite.js --host 127.0.0.1
  ) > "$LOG_ROOT/frontend.log" 2>&1 &
  echo $! > "$PID_ROOT/frontend.pid"
  wait_port frontend "$FRONTEND_PORT" "$LOG_ROOT/frontend.log"
}

print_urls() {
  echo
  echo "==> ChillNet da san sang"
  echo "    Web:           http://127.0.0.1:$FRONTEND_PORT"
  echo "    API Gateway:   http://127.0.0.1:$API_GATEWAY_PORT"
  echo "    MinIO Console: http://127.0.0.1:$MINIO_CONSOLE_PORT"
  echo "    Dung tat ca:   scripts/stop-all.sh"
}

check_application_ports
: "${JWT_SIGNER_KEY:?Can dat JWT_SIGNER_KEY trong .env}"

ensure_build
ensure_frontend_deps
start_mysql
start_mongodb
start_minio

echo "==> start backend + ai-service"
scripts/run-all.sh
start_frontend
print_urls
