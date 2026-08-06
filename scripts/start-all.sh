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
BACKEND_PORTS=(8080 8081 8082 8083 8084 8085 8086 8087 8088 8089 8090 8091)

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
    if port_open 5174; then
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

  if [ "$running" -gt 0 ] || port_open 5174; then
    fail "Stack dang chay do dang. Hay chay scripts/stop-all.sh roi thu lai."
  fi
}

start_mysql() {
  if port_open 3306; then
    echo "==> MySQL da chay san (:3306)"
    return
  fi

  require_exec "$RUNTIME_BIN/mysqld"
  [ -f "$DATA_ROOT/mysql/ibdata1" ] \
    || fail "Chua co MySQL data tai $DATA_ROOT/mysql. Can khoi tao moi truong truoc."
  rm -f "$PID_ROOT/mysql.pid" /tmp/chillnet-mysql.sock

  echo "==> start mysql (:3306)"
  nohup "$RUNTIME_BIN/mysqld" --no-defaults \
    --basedir="$ROOT/.runtime" --datadir="$DATA_ROOT/mysql" \
    --port=3306 --bind-address=127.0.0.1 --mysqlx=OFF \
    --socket=/tmp/chillnet-mysql.sock --pid-file="$PID_ROOT/mysql.pid" \
    --log-error="$LOG_ROOT/mysql.log" --innodb-buffer-pool-size=256M \
    >/dev/null 2>&1 &
  echo $! > "$PID_ROOT/mysql.pid"
  wait_port mysql 3306 "$LOG_ROOT/mysql.log"
}

start_mongodb() {
  if port_open 27018; then
    echo "==> MongoDB da chay san (:27018)"
    return
  fi

  require_exec "$RUNTIME_BIN/mongod"
  [ -f "$DATA_ROOT/mongo/WiredTiger" ] \
    || fail "Chua co MongoDB data tai $DATA_ROOT/mongo. Can khoi tao moi truong truoc."
  rm -f "$PID_ROOT/mongodb.pid"

  echo "==> start mongodb (:27018)"
  nohup "$RUNTIME_BIN/mongod" --dbpath "$DATA_ROOT/mongo" \
    --port 27018 --bind_ip 127.0.0.1 --auth --nounixsocket \
    --pidfilepath "$PID_ROOT/mongodb.pid" --logpath "$LOG_ROOT/mongodb.log" \
    --wiredTigerCacheSizeGB 0.5 >/dev/null 2>&1 &
  echo $! > "$PID_ROOT/mongodb.pid"
  wait_port mongodb 27018 "$LOG_ROOT/mongodb.log"
}

start_minio() {
  if port_open 9000 && port_open 9001; then
    echo "==> MinIO da chay san (:9000/:9001)"
    return
  fi
  if port_open 9000 || port_open 9001; then
    fail "MinIO dang chay do dang: can trong ca hai port 9000 va 9001."
  fi

  require_exec "$RUNTIME_BIN/minio"
  mkdir -p "$DATA_ROOT/minio"
  rm -f "$PID_ROOT/minio.pid"

  echo "==> start minio (API :9000, console :9001)"
  MINIO_ROOT_USER="${MINIO_ACCESS_KEY:-chillnet}" \
  MINIO_ROOT_PASSWORD="${MINIO_SECRET_KEY:-chillnet814362}" \
    nohup "$RUNTIME_BIN/minio" server "$DATA_ROOT/minio" \
      --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 \
      > "$LOG_ROOT/minio.log" 2>&1 &
  echo $! > "$PID_ROOT/minio.pid"
  wait_port minio-api 9000 "$LOG_ROOT/minio.log"
  wait_port minio-console 9001 "$LOG_ROOT/minio.log"
}

start_frontend() {
  if port_open 5174; then
    echo "==> Frontend da chay san (:5174)"
    return
  fi

  local node_bin
  node_bin=$(command -v node || true)
  [ -n "$node_bin" ] || fail "Khong tim thay node trong PATH/JAVA_HOME/bin."
  rm -f "$PID_ROOT/frontend.pid"

  echo "==> start frontend (:5174)"
  (
    cd frontend
    exec nohup "$node_bin" node_modules/vite/bin/vite.js --host 127.0.0.1
  ) > "$LOG_ROOT/frontend.log" 2>&1 &
  echo $! > "$PID_ROOT/frontend.pid"
  wait_port frontend 5174 "$LOG_ROOT/frontend.log"
}

print_urls() {
  echo
  echo "==> ChillNet da san sang"
  echo "    Web:           http://127.0.0.1:5174"
  echo "    API Gateway:   http://127.0.0.1:8080"
  echo "    MinIO Console: http://127.0.0.1:9001"
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
