#!/usr/bin/env bash
# post-product-owner.sh
# Triggered on Stop / SubagentStop events.
# Proposes launching software-architect when the product-owner agent finishes.

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

if [[ "$AGENT" != "product-owner" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `product-owner` terminée — spécifications rédigées.**\n\nLes user stories et critères d'acceptance sont prêts. Prochaine étape : concevoir l'architecture technique.\n\nLance **`software-architect`** pour transformer les specs en design technique :\n```\n@software-architect Conçois l'architecture pour les specs rédigées par le product-owner\n```\n\nIl produira :\n- 🏗️ Vue d'ensemble des composants et leurs responsabilités\n- 🔄 Flux de données entre les couches\n- ⚙️ Décisions techniques clés (stack, patterns, trade-offs)\n- 📐 Stratégie de déploiement et de scalabilité"
}
EOF
