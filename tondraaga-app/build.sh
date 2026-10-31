#!/usr/bin/env bash
# Builds the Tondraaga app as an unsigned, zip-aligned APK with the plain Android
# SDK tools (no Gradle).
#   build.sh <build-tools dir> <android.jar> <out dir> [versionCode] [versionName]
set -euo pipefail
BT="$1"; ANDROID_JAR="$2"; OUT="$3"; VC="${4:-1}"; VN="${5:-1.0}"
APP="$(cd "$(dirname "$0")" && pwd)"

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex"

"$BT/aapt2" compile --dir "$APP/res" -o "$OUT/res.zip"
"$BT/aapt2" link -I "$ANDROID_JAR" \
  --manifest "$APP/AndroidManifest.xml" -A "$APP/assets" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VC" --version-name "$VN" \
  --java "$OUT/gen" -o "$OUT/base.apk" "$OUT/res.zip"

javac -source 8 -target 8 -Xlint:-options -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find "$APP/src" "$OUT/gen" -name '*.java')

"$BT/d8" --release --min-api 24 --lib "$ANDROID_JAR" --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')

cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q -X ../unsigned.apk classes.dex)
"$BT/zipalign" -p -f 4 "$OUT/unsigned.apk" "$OUT/tondraaga-unsigned.apk"
"$BT/aapt2" dump badging "$OUT/tondraaga-unsigned.apk" | head -5
