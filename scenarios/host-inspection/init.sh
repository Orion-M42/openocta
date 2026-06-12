#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SCENARIO_JSON="${ROOT}/scenario.json"
GATEWAY_URL="${OPENOCTA_GATEWAY_URL:-http://127.0.0.1:18900}"
TOKEN="${OPENOCTA_GATEWAY_TOKEN:-}"

if [[ ! -f "$SCENARIO_JSON" ]]; then
  echo "missing scenario.json" >&2
  exit 1
fi

auth_header=()
if [[ -n "$TOKEN" ]]; then
  auth_header=(-H "Authorization: Bearer ${TOKEN}")
fi

install_kind() {
  local kind="$1" id="$2" category="$3"
  echo "==> install ${kind}: ${id}"
  curl -fsS "${auth_header[@]}" -H "Content-Type: application/json" \
    -X POST "${GATEWAY_URL%/}/api/v1/install" \
    -d "{\"kind\":\"${kind}\",\"id\":\"${id}\",\"type\":\"${category}\",\"category\":\"${category}\"}" \
    || echo "warn: failed to install ${kind} ${id}" >&2
}

while IFS= read -r line; do
  id=$(echo "$line" | jq -r '.id')
  cat=$(echo "$line" | jq -r '.category // empty')
  install_kind skill "$id" "${cat:-运维}"
done < <(jq -c '.skills[]?' "$SCENARIO_JSON")

while IFS= read -r line; do
  id=$(echo "$line" | jq -r '.id')
  cat=$(echo "$line" | jq -r '.category // empty')
  install_kind mcp "$id" "${cat:-运维}"
done < <(jq -c '.mcps[]?' "$SCENARIO_JSON")

echo "==> required environment variables:"
jq -r '.env[]? | "- \(.name): \(.description) (example: \(.example // "n/a"))"' "$SCENARIO_JSON"

echo "==> bundled tools (install manually if needed):"
jq -r '.bundledTools[]? | "- \(.name) [\(.platform)]: \(.relativePath)"' "$SCENARIO_JSON"

echo "done: host-inspection"
