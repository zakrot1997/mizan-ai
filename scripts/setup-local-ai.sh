#!/usr/bin/env bash
# ============================================================
#  ميزان AI — مثبّت محرك الذكاء المحلي (llama.cpp) للينكس
#  الاستخدام: bash scripts/setup-local-ai.sh
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo '== ميزان AI: تجهيز المحرك المحلي =='
mkdir -p bin models

echo '.. جلب معلومات أحدث إصدار'
TAG=$(curl -s https://api.github.com/repos/ggml-org/llama.cpp/releases/latest | grep -o '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   الإصدار: $TAG"

URL=$(curl -s https://api.github.com/repos/ggml-org/llama.cpp/releases/latest \
  | grep -o '"browser_download_url": *"[^"]*bin-ubuntu-x64[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "${URL:-}" ]; then
  echo '!! لم يُعثر على حزمة لينكس — حمّلها يدوياً من https://github.com/ggml-org/llama.cpp/releases'
  exit 1
fi

echo ".. تنزيل وتثبيت"
TMP=$(mktemp -d)
curl -sL "$URL" -o "$TMP/l.zip"
unzip -q -o "$TMP/l.zip" -d "$TMP/x"
find "$TMP/x" -type f \( -name 'llama-server' -o -name '*.so' \) -exec cp {} bin/ \;
chmod +x bin/llama-server || true
rm -rf "$TMP"

echo 'OK  تم تثبيت llama-server في bin/'
echo ''
echo 'التالي: ضع ملف LFM3-1.7B-Q5_K_M.gguf داخل models/ ثم شغّل المحرك من الإعدادات.'
