#!/bin/bash
NAME=$1
DIR="src/lib/components/$NAME"

if [ -z "$NAME" ]; then
  echo "Erreur: Nom du composant manquant."
  exit 1
fi

mkdir -p "$DIR"

# Création du fichier composant Svelte 5
cat <<EOF > "$DIR/$NAME.svelte"
<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = \$props();
</script>

<div class={className}>
  $NAME
</div>
EOF

# Création du fichier index pour l'export propre
echo "export { default as $NAME } from './$NAME.svelte';" > "$DIR/index.ts"

echo "Composant $NAME créé dans $DIR"
