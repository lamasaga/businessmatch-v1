#!/usr/bin/env bash
set -euo pipefail

ROOT="${BIZSIM_WEBAPP_ROOT:-/srv/businessmatch-v1/webapp}"
cd "$ROOT"

PUBLIC_HOST="${PUBLIC_HOST:-82.156.225.73}"
ORG_URL="http://${PUBLIC_HOST}:5174"
STU_URL="http://${PUBLIC_HOST}/games"

echo "=== BizSim deploy @ $(date -Is) ==="
echo "PUBLIC_HOST=$PUBLIC_HOST"

export COMPOSE_HTTP_TIMEOUT=600

docker-compose build \
  backend

docker-compose build \
  --build-arg "VITE_API_URL=" \
  --build-arg "VITE_ORGANIZER_URL=${ORG_URL}" \
  student

docker-compose build \
  --build-arg "VITE_API_URL=" \
  --build-arg "VITE_STUDENT_URL=${STU_URL}" \
  organizer

docker-compose up -d

echo "=== ps ==="
docker-compose ps

echo "=== health ==="
curl -fsS -o /dev/null -w "student:%{http_code}\n" "http://localhost/" || echo "student:fail"
curl -fsS -o /dev/null -w "organizer:%{http_code}\n" "http://localhost:5174/" || echo "organizer:fail"
curl -fsS -o /dev/null -w "backend:%{http_code}\n" "http://localhost:8000/docs" || echo "backend:fail"

echo "=== DONE @ $(date -Is) ==="
