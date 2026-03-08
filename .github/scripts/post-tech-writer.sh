#!/usr/bin/env bash
# post-tech-writer.sh
# Triggered on Stop / SubagentStop events.
# Proposes finalizing the sprint with a git commit when the tech-writer agent finishes.

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

if [[ "$AGENT" != "tech-writer" ]]; then
    exit 0
fi

cat <<'EOF'
{
  "systemMessage": "✅ **Session `tech-writer` terminée — documentation complète.**\n\nLe sprint est entièrement terminé : code implémenté, testé, reviewé et documenté.\n\nDernière étape : committer et pousser le travail.\n\nUtilise le skill **`git-smart-commit`** pour générer un message de commit sémantique :\n```\n@git-smart-commit\n```\n\nIl analysera les fichiers modifiés et produira un message de commit conforme à la convention **Conventional Commits** (`feat`, `fix`, `docs`, `test`, `chore`…) prêt à copier-coller."
}
EOF
