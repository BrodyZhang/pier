#!/usr/bin/env bash
# renew-cert.sh — Renew Let's Encrypt SSL certs on the VPS.
#
# Why standalone (NOT --nginx):
#   The reverse proxy (`router`) runs inside Docker (nginx:alpine) and binds host
#   ports 80/443. There is NO system nginx on the host, so the certbot nginx
#   plugin cannot work. Standalone frees port 80 by briefly stopping the router.
#
# Default behavior (cron-safe): only renews certs expiring within 30 days.
# The router is only stopped when a renewal is actually needed, so everyday
# cron runs cause zero downtime.
#
# Usage (on the VPS, from ~/pier):
#   bash scripts/renew-cert.sh                # renew only when due
#   bash scripts/renew-cert.sh --force        # force renewal of all certs
#   bash scripts/renew-cert.sh --dry-run      # show what would happen (no changes)
set -euo pipefail

PIER_DIR="${PIER_DIR:-$HOME/pier}"
CERTS=(ailaopo.online test.ailaopo.online)
RENEW_DAYS=${RENEW_DAYS:-30}   # renew when expiring within this many days
FORCE=""
DRY_RUN=""

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE="--force-renewal"
      echo ">>> FORCE MODE — renewing regardless of expiry"
      ;;
    --dry-run)
      DRY_RUN="--dry-run"
      echo ">>> DRY RUN MODE — no certificates will be changed"
      ;;
  esac
done

if [ ! -d "$PIER_DIR" ]; then
  echo "ERROR: $PIER_DIR not found. Set PIER_DIR to your repo dir." >&2
  exit 1
fi
cd "$PIER_DIR"

# Resolve docker compose command (same logic as deploy-test.yml)
DC=""
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: no docker compose found" >&2
  exit 1
fi
echo "Using: ${DC}"

CERTBOT=$(command -v certbot || echo "/usr/bin/certbot")

# Collect certs that actually need renewal (or force/dry-run everything)
NEED_RENEW=()
for name in "${CERTS[@]}"; do
  cert="/etc/letsencrypt/live/${name}/fullchain.pem"
  if [ ! -f "$cert" ]; then
    echo "WARN: no cert at $cert — renewing to be safe"
    NEED_RENEW+=("$name")
    continue
  fi
  if openssl x509 -checkend "$((RENEW_DAYS * 86400))" -noout -in "$cert" >/dev/null 2>&1; then
    echo "OK: ${name} valid for more than ${RENEW_DAYS} days — skipping"
  else
    echo "DUE: ${name} expires within ${RENEW_DAYS} days — will renew"
    NEED_RENEW+=("$name")
  fi
done

if [ -n "$FORCE" ]; then
  NEED_RENEW=("${CERTS[@]}")
fi

if [ "${#NEED_RENEW[@]}" -eq 0 ] && [ -z "$DRY_RUN" ]; then
  echo "Nothing to renew. Exiting."
  exit 0
fi

# Only stop the router when something actually needs renewing (or force/dry-run)
if [ "${#NEED_RENEW[@]}" -gt 0 ] || [ -n "$DRY_RUN" ]; then
  echo "=== Stopping router to free port 80 ==="
  ${DC} stop router
fi

# Renew each certificate lineage via standalone
for name in "${NEED_RENEW[@]}"; do
  echo "=== Renewing ${name} ==="
  sudo "$CERTBOT" certonly --standalone --non-interactive --agree-tos \
    --cert-name "${name}" ${FORCE} ${DRY_RUN}
done

# Restart router (nginx reads the freshly mounted certs on startup)
if [ -z "$DRY_RUN" ]; then
  echo "=== Starting router ==="
  ${DC} start router
fi

# Verify the served certs
echo "=== Verification ==="
for domain in "${CERTS[@]}"; do
  echo "--- ${domain} ---"
  echo | openssl s_client -servername "${domain}" -connect 127.0.0.1:443 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates 2>/dev/null || true
done
echo "Done."