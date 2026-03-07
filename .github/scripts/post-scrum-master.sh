#!/usr/bin/env bash
# post-scrum-master.sh
# Triggered on Stop / SubagentStop events.
# Proposes the next step (TDD or direct implementation) when the scrum-master agent finishes.

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

if [[ "$AGENT" != "scrum-master" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `scrum-master` terminée — sprint planifié.**\n\nLe backlog est prêt. Choisis ta prochaine étape :\n\n---\n\n### Option A — TDD (recommandé)\nLance **`test-engineer`** pour écrire les tests en premier, avant toute implémentation.\n```\n@test-engineer Écris les tests pour le sprint défini par le scrum-master\n```\nLe `software-engineer` implémentera ensuite en faisant passer les tests.\n\n---\n\n### Option B — Implémentation directe\nLance **`software-engineer`** pour coder directement les US du sprint.\n```\n@software-engineer Implémente les tâches du sprint défini par le scrum-master\n```\nLe `test-engineer` pourra intervenir après pour compléter la couverture.\n\n---\n\n> 💡 **Conseil** : l'Option A (TDD) est préférable quand les critères d'acceptance sont bien définis. L'Option B convient quand le périmètre technique est encore à explorer."
}
EOF
