#!/usr/bin/env bash
# post-code-reviewer.sh
# Triggered on Stop / SubagentStop events.
# Proposes launching tech-writer when the code-reviewer agent finishes.

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

if [[ "$AGENT" != "code-reviewer" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `code-reviewer` terminée — code validé.**\n\nLe sprint est prêt à être mergé. Dernière étape : la documentation et la PR.\n\nLance **`tech-writer`** pour finaliser le sprint :\n```\n@tech-writer Documente le sprint et prépare la PR\n```\n\nIl produira :\n- 📄 Mise à jour du `README.md`\n- 📐 Spec OpenAPI (`docs/openapi.yaml`)\n- 📋 Description de PR prête à copier-coller\n- 📝 Guide de migration (si breaking changes)"
}
EOF
