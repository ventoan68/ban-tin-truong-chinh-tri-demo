@echo off
setlocal
cd /d "%~dp0"
echo BAN TIN TRUONG CHINH TRI - CHAY THU TAI MAY
echo.
py -3 -c "import http.server" >nul 2>&1
if not errorlevel 1 (
    echo Mo Chrome hoac Edge tai: http://127.0.0.1:8000/
    echo Giu cua so nay mo. Nhan Ctrl+C de dung.
    py -3 -m http.server 8000 --bind 127.0.0.1
    goto end
)
python -c "import sys,http.server;assert sys.version_info.major==3" >nul 2>&1
if not errorlevel 1 (
    echo Mo Chrome hoac Edge tai: http://127.0.0.1:8000/
    echo Giu cua so nay mo. Nhan Ctrl+C de dung.
    python -m http.server 8000 --bind 127.0.0.1
    goto end
)
echo Chua tim thay Python 3. Can cai Python 3 de chay thu tai may.
:end
pause
endlocal
