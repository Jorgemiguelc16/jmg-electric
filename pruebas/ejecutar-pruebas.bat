@echo off
rem Abre las pruebas del calculo en una ventana aparte de Chrome (o Edge).
rem Se usa un perfil temporal para que el navegador permita leer los archivos locales.
set "PAGINA=%~dp0index.html"
set "PERFIL=%TEMP%\jmg-electric-pruebas"
set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAV%" (
  echo No se encontro Chrome ni Edge. Abra las pruebas desde la pagina publicada: /pruebas/
  pause
  exit /b 1
)
start "" "%NAV%" --allow-file-access-from-files --user-data-dir="%PERFIL%" --no-first-run "file:///%PAGINA:\=/%"
