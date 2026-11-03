@echo off
REM ميزان AI — مثبّت المحرك المحلي (شغّله بنقرة مزدوجة)
REM للتسريع ببطاقة AMD RX 580: setup-local-ai.bat --vulkan
setlocal
set ARGS=
if /I "%~1"=="--vulkan" set ARGS=-Vulkan
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-local-ai.ps1" %ARGS%
pause
