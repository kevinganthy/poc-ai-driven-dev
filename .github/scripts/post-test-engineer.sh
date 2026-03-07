#!/usr/bin/env bash
# post-test-engineer.sh
# Triggered on Stop / SubagentStop events.
# Proposes launching software-engineer when the test-engineer agent finishes.

set -euo pipefail

INPUT="$(cat)"

# Extract agent name — handles Stop (agent) and SubagentStop (subagent) payloads
AGENT=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    agent = (
        data.get('agent') or
        data.get('subagent') or
        data.get('agentName') or
        data.get('agent_name') or
        ''
    )
    print(str(agent).lower())
except Exception:
    print('')
" 2>/dev/null || echo "")

if [[ "$AGENT" != "test-engineer" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `test-engineer` terminée — tests écrits.**\n\nLes tests sont en place et échouent (rouge). Il est temps de les faire passer.\n\nLance **`software-engineer`** pour implémenter le code qui satisfait les tests :\n```\n@software-engineer Implémente le code pour faire passer les tests écrits par le test-engineer\n```\n\n> 💡 Le `software-engineer` doit viser le **minimum de code nécessaire** pour passer les tests — pas plus. Toute logique non couverte par un test existant est hors scope."
}
EOF
