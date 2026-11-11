#!/bin/sh
# Instala o deskreport-client em ~/.deskreport/bin e cria o comando deskreport em ~/.local/bin
# Uso: curl -fsSL https://deskreport.com.br/install.sh | sh
set -e

BASE_URL="${DESKREPORT_URL:-https://app.deskreport.com.br}"
DEST="$HOME/.deskreport/bin"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

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
  Darwin) PACKAGE="deskreport-macos.tar.gz" ;;
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

# O widget é só o app nativo da bandeja, baixado da última release. Se o download falhar, o app que já estava instalado fica
RELEASE="https://github.com/4gocompany/deskreport/releases/latest/download"
NATIVE=""

# No Linux é o AppImage, com entrada no menu de aplicativos
if [ "$(uname -s)" = "Linux" ]; then
  if curl -fsSL "$RELEASE/DeskReport-linux.AppImage" -o "$DEST/DeskReport.AppImage.part"; then
    mv "$DEST/DeskReport.AppImage.part" "$DEST/DeskReport.AppImage"
    chmod +x "$DEST/DeskReport.AppImage"
  else
    rm -f "$DEST/DeskReport.AppImage.part"
  fi
  if [ -x "$DEST/DeskReport.AppImage" ]; then
    NATIVE="1"
    mkdir -p "$HOME/.local/share/applications"
    cat > "$HOME/.local/share/applications/deskreport.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=DeskReport
Comment=Agentes do DeskReport nesta máquina
Exec="$DEST/DeskReport.AppImage"
Icon=$DEST/icon.svg
Terminal=false
Categories=Development;
StartupWMClass=DeskReport
EOF
  fi
fi

# No macOS é o DeskReport.app em ~/Applications, que aparece no Launchpad e no Spotlight
if [ "$(uname -s)" = "Darwin" ]; then
  APP="$HOME/Applications/DeskReport.app"
  DMG="$DEST/DeskReport.dmg"
  MOUNT="$DEST/dmg"
  mkdir -p "$HOME/Applications"
  # O atalho antigo, sem o Electron em Frameworks, sai de vez
  if [ -d "$APP" ] && [ ! -d "$APP/Contents/Frameworks" ]; then rm -rf "$APP"; fi
  if curl -fsSL "$RELEASE/DeskReport-macos.dmg" -o "$DMG"; then
    if hdiutil attach "$DMG" -nobrowse -quiet -mountpoint "$MOUNT"; then
      rm -rf "$APP"
      cp -R "$MOUNT/DeskReport.app" "$APP" || true
      hdiutil detach "$MOUNT" -quiet || true
    fi
  fi
  rm -f "$DMG"
  if [ -d "$APP/Contents/Frameworks" ]; then NATIVE="1"; fi
fi

if [ -z "$NATIVE" ]; then
  echo "Não consegui baixar o app do DeskReport da última release. Os agentes rodam, mas o widget só abre depois de rodar o instalador de novo."
fi

echo "DeskReport instalado. Abra pelo menu de aplicativos ou pelo Launchpad no macOS"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "Adicione ~/.local/bin ao seu PATH para usar o comando deskreport." ;;
esac
