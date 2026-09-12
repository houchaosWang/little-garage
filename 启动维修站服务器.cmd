@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 小小维修站 - 局域网服务器
node tools\serve.mjs
echo.
echo 服务器已停止。按任意键关闭窗口。
pause >nul
