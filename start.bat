@echo off
chcp 65001 >nul
title AI Voice Assistant Server
echo 正在启动 AI 语音助手服务...
cd /d %~dp0

echo.
echo [1/2] 检查前端构建状态...
if not exist "frontend\dist\index.html" (
    echo 初次运行，正在为您安装前端依赖并构建界面，这可能需要一两分钟...
    cd frontend
    call npm install
    call npm run build
    cd ..
) else (
    echo 前端已构建完成。
)

echo.
echo [2/2] 正在启动后端服务...
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

:: 延迟 2 秒后在默认浏览器中打开页面
start "" "http://127.0.0.1:8000"

echo 服务正在运行，请勿关闭此窗口。
echo 如果浏览器没有自动打开，请手动访问: http://127.0.0.1:8000
echo.
uvicorn web_app:app --host 127.0.0.1 --port 8000 --reload
pause
