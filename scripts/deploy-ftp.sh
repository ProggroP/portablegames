#!/usr/bin/env bash
# Lädt den Build aus dist/ per FTPS auf den Webspace.
#
# Erwartet als Umgebungsvariablen:
#   FTP_SERVER, FTP_USERNAME, LFTP_PASSWORD (das FTP-Passwort), FTP_DIR (Zielordner)
#
# Reihenfolge: erst neue Dateien in assets/, dann Startseite und Service Worker,
# zuletzt alte Dateien in assets/ löschen. So verweist die Seite nie auf Fehlendes.
# Gelöscht wird nur innerhalb von assets/, andere Dateien im Zielordner bleiben.
set -euo pipefail

: "${FTP_SERVER:?FTP_SERVER fehlt}"
: "${FTP_USERNAME:?FTP_USERNAME fehlt}"
: "${LFTP_PASSWORD:?FTP-Passwort fehlt}"
: "${FTP_DIR:?FTP_DIR fehlt}"

DIR="${FTP_DIR%/}/"
PORT="${FTP_PORT:-21}"
VERIFY="${FTP_VERIFY_CERT:-true}"

lftp <<EOF
set cmd:fail-exit true
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate $VERIFY
set ftp:passive-mode true
set net:max-retries 3
set net:reconnect-interval-base 5
set net:timeout 30
open --env-password -u "$FTP_USERNAME" -p $PORT "ftp://$FTP_SERVER"
mkdir -p -f "${DIR}assets"
mirror --reverse --verbose dist/assets/ "${DIR}assets/"
mirror --reverse --verbose --exclude ^assets/ dist/ "$DIR"
mirror --reverse --verbose --delete dist/assets/ "${DIR}assets/"
bye
EOF
