#!/bin/sh
# Instala o deskreport-client em ~/.deskreport/bin e cria o comando deskreport em ~/.local/bin
# Uso: curl -fsSL https://deskreport.com.br/install.sh | sh
set -e

BASE_URL="${DESKREPORT_URL:-https://app.deskreport.com.br}"
DEST="$HOME/.deskreport/bin"
export PATH="/opt/homebrew/bin:$PATH"

# Se o node nao estiver no PATH, procura nos caminhos do NVM, FNM ou Volta
if ! command -v node >/dev/null 2>&1; then
  for dir in "$HOME"/.nvm/versions/node/*/bin "$HOME"/.local/share/nvm/*/bin "$HOME"/.fnm/current/bin "$HOME"/.volta/bin; do
    if [ -x "$dir/node" ]; then
      export PATH="$dir:$PATH"
      break
    fi
  done
fi

case "$(uname -s)" in
  Linux) PACKAGE="deskreport-linux.tar.gz" ;;
  Darwin)
    if [ "$(uname -m)" != "arm64" ]; then
      echo "No macOS só há pacote para Apple Silicon (arm64)."
      exit 1
    fi
    PACKAGE="deskreport-macos-arm64.tar.gz"
    ;;
  *)
    echo "Sistema não suportado: $(uname -s)"
    exit 1
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "Instale o Node.js 20 ou superior antes de continuar."
  exit 1
fi

mkdir -p "$DEST" "$HOME/.local/bin"

# Rodando de dentro do pacote já extraído, copia os arquivos. Pelo curl, baixa o pacote do sistema
if [ -f "$0" ] && [ -f "$(dirname "$0")/deskreport-client.mjs" ]; then
  cp -R "$(dirname "$0")"/. "$DEST"/
else
  curl -fsSL "$BASE_URL/downloads/$PACKAGE" | tar -xz -C "$DEST"
fi

(cd "$DEST" && npm install --omit=dev --no-audit --no-fund --silent)
chmod +x "$DEST/deskreport"
ln -sf "$DEST/deskreport" "$HOME/.local/bin/deskreport"

echo "DeskReport instalado. Rode: deskreport setup"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "Adicione ~/.local/bin ao seu PATH para usar o comando deskreport." ;;
esac
