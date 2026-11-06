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

# No Linux o DeskReport aparece no menu de aplicativos e abre como app, sem terminal
if [ "$(uname -s)" = "Linux" ]; then
  mkdir -p "$HOME/.local/share/applications"
  cat > "$HOME/.local/share/applications/deskreport.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=DeskReport
Comment=Agentes do DeskReport nesta máquina
Exec="$DEST/deskreport" widget
Icon=$DEST/icon.svg
Terminal=false
Categories=Development;
StartupWMClass=DeskReport
EOF
fi

# No macOS vira o DeskReport.app em ~/Applications: aparece no Launchpad e no Spotlight e abre sem terminal
if [ "$(uname -s)" = "Darwin" ]; then
  APP="$HOME/Applications/DeskReport.app"
  rm -rf "$APP"
  mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
  printf '#!/bin/sh\nexec "%s/deskreport" widget\n' "$DEST" > "$APP/Contents/MacOS/DeskReport"
  chmod +x "$APP/Contents/MacOS/DeskReport"
  sips -s format icns "$DEST/icon.png" --out "$APP/Contents/Resources/DeskReport.icns" >/dev/null 2>&1 || true
  cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>DeskReport</string>
  <key>CFBundleIdentifier</key><string>br.com.deskreport.app</string>
  <key>CFBundleExecutable</key><string>DeskReport</string>
  <key>CFBundleIconFile</key><string>DeskReport</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
EOF
fi

echo "DeskReport instalado. Abra pelo menu de aplicativos, pelo Launchpad no macOS ou rode: deskreport widget"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "Adicione ~/.local/bin ao seu PATH para usar o comando deskreport." ;;
esac
