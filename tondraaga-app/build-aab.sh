#!/usr/bin/env bash
# Builds the Android App Bundle (.aab) for Google Play, after build.sh (it reuses the compiled
# resources and classes.dex in the same output folder).
#   build-aab.sh <build-tools dir> <android.jar> <out dir> <versionCode> <versionName> <bundletool.jar>
set -euo pipefail
BT="$1"; ANDROID_JAR="$2"; OUT="$3"; VC="$4"; VN="$5"; BUNDLETOOL="$6"
APP="$(cd "$(dirname "$0")" && pwd)"

rm -rf "$OUT/aab" && mkdir -p "$OUT/aab/module"
"$BT/aapt2" link --proto-format -I "$ANDROID_JAR" \
  --manifest "$APP/AndroidManifest.xml" -A "$APP/assets" \
  --min-sdk-version 24 --target-sdk-version "${TARGET_SDK:-36}" \
  --version-code "$VC" --version-name "$VN" \
  -o "$OUT/aab/proto.zip" "$OUT/res.zip"

(
  cd "$OUT/aab/module"
  unzip -q ../proto.zip
  mkdir -p manifest dex
  mv AndroidManifest.xml manifest/
  cp "$OUT/dex/classes.dex" dex/
  zip -q -r -X ../base.zip manifest dex res assets resources.pb
)
java -jar "$BUNDLETOOL" build-bundle --modules="$OUT/aab/base.zip" --output="$OUT/tondraaga-unsigned.aab" --overwrite
java -jar "$BUNDLETOOL" validate --bundle="$OUT/tondraaga-unsigned.aab" | head -20
