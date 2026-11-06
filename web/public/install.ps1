# Instala o deskreport-client em $HOME\.deskreport\bin e coloca a pasta no PATH do usuário
# Uso no PowerShell (Windows 10 e 11): irm https://deskreport.com.br/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$BaseUrl = if ($env:DESKREPORT_URL) { $env:DESKREPORT_URL } else { 'https://app.deskreport.com.br' }
$Dest = Join-Path $HOME '.deskreport\bin'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Instale o Node.js 20 ou superior antes de continuar.'
  return
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# Rodando de dentro do pacote já extraído, copia os arquivos. Pelo irm, baixa o pacote do Windows
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'deskreport-client.mjs'))) {
  Copy-Item -Path (Join-Path $PSScriptRoot '*') -Destination $Dest -Recurse -Force
} else {
  $Package = Join-Path $env:TEMP 'deskreport-windows-x64.tar.gz'
  Invoke-WebRequest -Uri "$BaseUrl/downloads/deskreport-windows-x64.tar.gz" -OutFile $Package -UseBasicParsing
  tar -xzf $Package -C $Dest
  Remove-Item $Package
}

Push-Location $Dest
npm.cmd install --omit=dev --no-audit --no-fund --silent
Pop-Location

# Atalho no Menu Iniciar para abrir o DeskReport como app, sem terminal
$Shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path ([Environment]::GetFolderPath('Programs')) 'DeskReport.lnk'))
$Shortcut.TargetPath = 'wscript.exe'
$Shortcut.Arguments = '"' + (Join-Path $Dest 'DeskReport.vbs') + '"'
$Shortcut.WorkingDirectory = $Dest
$Shortcut.Save()

$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (($UserPath -split ';') -contains $Dest)) {
  [Environment]::SetEnvironmentVariable('Path', (@($UserPath, $Dest) | Where-Object { $_ }) -join ';', 'User')
  $env:Path = "$env:Path;$Dest"
}

Write-Host 'DeskReport instalado. Abra pelo Menu Iniciar ou rode: deskreport widget'
Write-Host 'Abra um novo terminal para usar o comando deskreport.'
