#!/bin/bash
# Oracle Free Tier idle prevention — self-ping to /api/health every 5 min via cron

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}/api/health"

if ! curl -sf --max-time 10 "$URL" > /dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: health check failed ($URL)" >&2
fi
