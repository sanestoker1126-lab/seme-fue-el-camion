@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import threading,webbrowser,http.server; threading.Timer(1.0,lambda:webbrowser.open('http://localhost:8000/Se_Me_Fue_El_Camion.html')).start(); http.server.ThreadingHTTPServer(('127.0.0.1',8000),http.server.SimpleHTTPRequestHandler).serve_forever()"
) else (
  where python >nul 2>nul
  if errorlevel 1 (echo Instala Python 3. & pause & exit /b 1)
  python -c "import threading,webbrowser,http.server; threading.Timer(1.0,lambda:webbrowser.open('http://localhost:8000/Se_Me_Fue_El_Camion.html')).start(); http.server.ThreadingHTTPServer(('127.0.0.1',8000),http.server.SimpleHTTPRequestHandler).serve_forever()"
)
pause
