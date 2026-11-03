# ============================================================
#  ميزان AI — مثبّت محرك الذكاء المحلي (llama.cpp) لويندوز
#  يحمّل أحدث إصدار من llama.cpp ويضعه في bin\
#  يدعم معالجك i7-3770 (CPU) وبطاقة RX 580 (Vulkan اختياري)
# ============================================================
param(
  [switch]$Vulkan   # استخدم: .\setup-local-ai.ps1 -Vulkan   لتسريع RX 580
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "== ميزان AI: تجهيز المحرك المحلي ==" -ForegroundColor Cyan

# 1) إنشاء المجلدات
New-Item -ItemType Directory -Force -Path "bin", "models" | Out-Null

# 2) جلب أحدث إصدار من llama.cpp (ggml-org)
Write-Host ".. جلب معلومات أحدث إصدار من GitHub" -ForegroundColor DarkGray
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest" -Headers @{ "User-Agent" = "mizan-ai" }
$pattern = if ($Vulkan) { "bin-win-vulkan-x64\.zip$" } else { "bin-win-cpu-(x64|avx2-x64)\.zip$" }
$asset = $release.assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
if (-not $asset) {
  $asset = $release.assets | Where-Object { $_.name -match "bin-win.*x64.*\.zip$" } | Select-Object -First 1
}
if (-not $asset) { throw "لم يتم العثور على حزمة ويندوز في آخر إصدار — حمّلها يدوياً من https://github.com/ggml-org/llama.cpp/releases" }

Write-Host ".. تنزيل $($asset.name) ($([math]::Round($asset.size/1MB))MB)" -ForegroundColor DarkGray
$zip = Join-Path $env:TEMP "llamacpp.zip"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip

# 3) فك الضغط إلى bin\
Write-Host ".. فك الضغط إلى bin\" -ForegroundColor DarkGray
$tmp = Join-Path $env:TEMP ("llamacpp-" + [guid]::NewGuid())
Expand-Archive -Path $zip -DestinationPath $tmp -Force
Get-ChildItem -Recurse -Path $tmp -Filter "*.exe" | ForEach-Object { Copy-Item $_.FullName "bin\" -Force }
Get-ChildItem -Recurse -Path $tmp -Filter "*.dll" | ForEach-Object { Copy-Item $_.FullName "bin\" -Force }
Remove-Item -Recurse -Force $tmp, $zip

if (Test-Path "bin\llama-server.exe") {
  Write-Host "OK  تم تثبيت llama-server.exe في bin\" -ForegroundColor Green
} else {
  throw "فشل العثور على llama-server.exe بعد فك الضغط"
}

# 4) إرشادات النموذج
Write-Host ""
Write-Host "الخطوة التالية — ضع ملف النموذج داخل مجلد models\ :" -ForegroundColor Cyan
Write-Host "  1) افتح https://huggingface.co/models?search=LFM3%20GGUF" -ForegroundColor White
Write-Host "  2) حمّل:  LFM3-1.7B-Q5_K_M.gguf   (تقريباً 1.2GB)" -ForegroundColor White
Write-Host "  3) ضع الملف في:  $root\models\" -ForegroundColor White
Write-Host ""
Write-Host "ثم من داخل البرنامج:  الإعدادات > الخادم المحلي > تشغيل المحرك" -ForegroundColor Green
