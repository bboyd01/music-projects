#!/bin/bash
# Music Projects Opener — lets the "Open Project" button open project files in your DAW.
#
# Usage (macOS):  curl -fsSL https://YOUR-SERVER/opener/install.sh | bash -s -- .rpp
# The argument lists the project file extensions the helper may open (space-separated, default .rpp).
#
# It creates ~/Applications/Music Projects Opener.app, a tiny background app (no Dock icon)
# that handles musicprojects://open?path=… links. It only opens files that exist and end in
# an allowed extension, using macOS's `open` (your DAW's default app for that file type).
# Remove it any time by deleting the app.
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
	echo "This installer is for macOS." >&2
	exit 1
fi

EXTS="${*:-.rpp}"
for e in $EXTS; do
	case "$e" in
		.[A-Za-z0-9]*) ;;
		*) echo "Extensions should look like .rpp (got: $e)" >&2; exit 1 ;;
	esac
done

APP="$HOME/Applications/Music Projects Opener.app"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$HOME/Applications"

# 1) The AppleScript applet: hands the link to the guard script below.
cat > "$WORK/opener.applescript" <<'APPLESCRIPT'
on open location theURL
	set guard to (POSIX path of (path to me)) & "Contents/Resources/open-project.sh"
	do shell script "/bin/sh " & quoted form of guard & " " & quoted form of theURL
end open location

on run
	display dialog "Music Projects Opener is installed." & return & return & "Use the Open Project button on a track to open it in your DAW." buttons {"OK"} default button 1 with title "Music Projects"
end run
APPLESCRIPT

rm -rf "$APP"
osacompile -o "$APP" "$WORK/opener.applescript"

# 2) The guard: decode the path, check it, then `open` it.
cat > "$APP/Contents/Resources/open-project.sh" <<'GUARD'
#!/bin/sh
# Opens a project file from a musicprojects://open?path=<url-encoded path> link.
url="$1"
prefix="musicprojects://open?path="
case "$url" in
	"$prefix"*) ;;
	*) exit 1 ;;
esac
encoded="${url#"$prefix"}"
# Percent-decode (perl ships with macOS).
path=$(printf '%s' "$encoded" | /usr/bin/perl -pe 's/%([0-9A-Fa-f]{2})/chr(hex($1))/ge')
# Allow ~/… paths.
case "$path" in
	"~/"*) path="$HOME/${path#"~/"}" ;;
esac

alert() {
	/usr/bin/osascript -e 'on run argv' -e 'display alert (item 1 of argv) message (item 2 of argv)' -e 'end run' "$1" "$2" >/dev/null 2>&1 || true
}

allowed=0
lower=$(printf '%s' "$path" | tr '[:upper:]' '[:lower:]')
for e in __EXTS__; do
	le=$(printf '%s' "$e" | tr '[:upper:]' '[:lower:]')
	case "$lower" in
		*"$le") allowed=1 ;;
	esac
done
if [ "$allowed" != 1 ]; then
	alert "Not a project file" "$(printf 'Music Projects Opener only opens __EXTS__ files.\n\n%s' "$path")"
	exit 1
fi
if [ ! -f "$path" ]; then
	alert "Project not found" "$path"
	exit 1
fi
exec ${OPEN_CMD:-/usr/bin/open} "$path"
GUARD
# Bake in the allowed extensions.
/usr/bin/sed -i '' "s|__EXTS__|$EXTS|g" "$APP/Contents/Resources/open-project.sh"
chmod +x "$APP/Contents/Resources/open-project.sh"

# 3) Register the musicprojects:// link type and hide the Dock icon.
PL="$APP/Contents/Info.plist"
PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleIdentifier app.musicprojects.opener" "$PL" 2>/dev/null || $PB -c "Add :CFBundleIdentifier string app.musicprojects.opener" "$PL"
$PB -c "Delete :CFBundleURLTypes" "$PL" 2>/dev/null || true
$PB -c "Add :CFBundleURLTypes array" \
	-c "Add :CFBundleURLTypes:0 dict" \
	-c "Add :CFBundleURLTypes:0:CFBundleURLName string Music Projects Opener" \
	-c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" \
	-c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string musicprojects" "$PL"
$PB -c "Delete :LSUIElement" "$PL" 2>/dev/null || true
$PB -c "Add :LSUIElement bool true" "$PL"

# Editing the bundle invalidates its signature; re-sign locally (ad-hoc).
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"

echo "Installed: $APP"
echo "Allowed extensions: $EXTS"
echo "Try an Open Project button now. Your browser will ask once to allow opening Music Projects Opener."
