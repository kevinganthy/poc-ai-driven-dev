#!/usr/bin/env bash
# validate-compose.sh — Validates a docker-compose.yml against project conventions
# Usage: ./validate-compose.sh [path/to/compose.yml]

set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yml}"
ERRORS=()
WARNINGS=()

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo -e "${RED}ERROR: File not found: $COMPOSE_FILE${NC}"
  exit 1
fi

echo "Validating: $COMPOSE_FILE"
echo "---"

# 1. Syntax check via docker compose config
if ! docker compose -f "$COMPOSE_FILE" config --quiet 2>/dev/null; then
  ERRORS+=("SYNTAX: 'docker compose config' failed — invalid YAML or compose syntax")
fi

CONTENT=$(cat "$COMPOSE_FILE")

# 2. Isolated networks — must declare at least one custom network
if ! echo "$CONTENT" | grep -qE '^networks:'; then
  ERRORS+=("NETWORKS: No top-level 'networks:' block found. Define a dedicated network instead of using the default.")
fi

# 3. Secrets — no hardcoded passwords
if echo "$CONTENT" | grep -iE 'password\s*:\s*\S+' | grep -vE 'password\s*:\s*\$\{'; then
  ERRORS+=("SECRETS: Hardcoded password detected. Use environment variables (\${VAR}) or a .env file.")
fi

# 4. Restart policy — backend and db services must have restart
for SERVICE in backend db; do
  # Extract the block for each service and check for restart
  BLOCK=$(awk "/^  ${SERVICE}:/,/^  [^ ]/" "$COMPOSE_FILE")
  if ! echo "$BLOCK" | grep -q 'restart:'; then
    ERRORS+=("RESTART: Service '${SERVICE}' is missing 'restart: unless-stopped'.")
  fi
done

# 5. depends_on with service_healthy — backend should wait for db
BACKEND_BLOCK=$(awk '/^  backend:/,/^  [^ ]/' "$COMPOSE_FILE")
if ! echo "$BACKEND_BLOCK" | grep -q 'depends_on'; then
  WARNINGS+=("DEPENDS_ON: Service 'backend' has no 'depends_on'. Consider waiting for 'db' with condition: service_healthy.")
elif ! echo "$CONTENT" | grep -q 'service_healthy'; then
  WARNINGS+=("DEPENDS_ON: 'depends_on' found but no 'service_healthy' condition. The DB may not be ready when backend starts.")
fi

# 6. Healthcheck on db
DB_BLOCK=$(awk '/^  db:/,/^  [^ ]/' "$COMPOSE_FILE")
if ! echo "$DB_BLOCK" | grep -q 'healthcheck'; then
  WARNINGS+=("HEALTHCHECK: Service 'db' has no healthcheck. Add one so depends_on service_healthy works correctly.")
fi

# 7. Named volumes — no anonymous volumes
if echo "$CONTENT" | grep -E '^\s+-\s+/'; then
  WARNINGS+=("VOLUMES: Anonymous bind mounts detected. Prefer named volumes for data persistence.")
fi

# --- Report ---
echo ""
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo -e "${RED}ERRORS (${#ERRORS[@]}):${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}✗ $err${NC}"
  done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}WARNINGS (${#WARNINGS[@]}):${NC}"
  for warn in "${WARNINGS[@]}"; do
    echo -e "  ${YELLOW}⚠ $warn${NC}"
  done
fi

echo ""
if [[ ${#ERRORS[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
  echo -e "${GREEN}✓ All checks passed.${NC}"
  exit 0
elif [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo -e "${YELLOW}✓ No errors, but ${#WARNINGS[@]} warning(s) to review.${NC}"
  exit 0
else
  echo -e "${RED}✗ Validation failed: ${#ERRORS[@]} error(s), ${#WARNINGS[@]} warning(s).${NC}"
  exit 1
fi
