#!/usr/bin/env bash
# post-feature-developer.sh
# Triggered on Stop / SubagentStop events.
# Injects a validation reminder when the feature-developer agent finishes.

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

if [[ "$AGENT" != "feature-developer" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `feature-developer` terminée.**\n\nProchaine étape recommandée : valider que l'implémentation est conforme au sprint planifié.\n\nLance le prompt de validation :\n```\n/validate-sprint\n```\nIl vérifiera chaque tâche du sprint contre le code réel, exécutera les tests, et produira un rapport ✅ / ⚠️ / ❌."
}
EOF
