#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Pemakaian: $0 <base-url>" >&2
  exit 2
fi
BASE_URL="${BASE_URL%/}"

HEALTH_FILE="$(mktemp)"
LOGIN_FILE="$(mktemp)"
trap 'rm -f "$HEALTH_FILE" "$LOGIN_FILE"' EXIT

echo "Cek health: $BASE_URL/api/health"
for i in $(seq 1 30); do
  code="$(curl -sS --connect-timeout 5 --max-time 15 -o "$HEALTH_FILE" -w '%{http_code}' "$BASE_URL/api/health" || true)"
  if [[ "$code" == "200" ]] && grep -qE '"database"[[:space:]]*:[[:space:]]*"ok"' "$HEALTH_FILE"; then
    echo "Health OK"
    break
  fi
  if [[ "$i" == "30" ]]; then
    echo "Health gagal (HTTP $code)" >&2
    cat "$HEALTH_FILE" >&2 || true
    exit 1
  fi
  sleep 5
done

echo "Cek halaman login: $BASE_URL/login"
login_code="$(curl -sS --connect-timeout 5 --max-time 30 -L -o "$LOGIN_FILE" -w '%{http_code}' "$BASE_URL/login" || true)"
if [[ "$login_code" != "200" ]]; then
  echo "Halaman login gagal (HTTP $login_code)" >&2
  exit 1
fi
if ! grep -qi "google" "$LOGIN_FILE"; then
  echo "Halaman login tidak memuat tombol Google" >&2
  exit 1
fi

echo "Smoke test lulus"
