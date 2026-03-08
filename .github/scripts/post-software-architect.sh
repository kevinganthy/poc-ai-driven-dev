#!/usr/bin/env bash
# post-software-architect.sh
# Triggered on Stop / SubagentStop events.
# Proposes launching scrum-master when the software-architect agent finishes.

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

if [[ "$AGENT" != "software-architect" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `software-architect` terminée — architecture conçue.**\n\nLe design technique est prêt. Prochaine étape : planifier la production en sprints.\n\nLance **`scrum-master`** pour découper l'architecture en tâches et organiser le backlog :\n```\n@scrum-master Planifie les sprints à partir de l'architecture définie par le software-architect\n```\n\nIl produira :\n- 📋 Backlog priorisé avec les user stories\n- 🗓️ Découpage en sprints avec estimations\n- 🎯 Critères de définition de \"done\" par tâche\n- ⚠️ Identification des dépendances et risques"
}
EOF
