@echo off
title DnD Master
echo.
echo  ==========================================
echo       DnD MASTER - Gestionale di gioco
echo  ==========================================
echo.

cd /d "C:\Users\Test\Desktop\Claude\Progetti\Commonplace\DnDMaster"

for /f "delims=" %%i in ('node --version 2^>^&1') do set NODECHECK=%%i
if "%NODECHECK%"=="" (
    echo  ERRORE: Node.js non trovato.
    echo  Scaricalo da https://nodejs.org versione LTS
    echo  e riavvia questo file dopo l'installazione.
    echo.
    pause
    exit /b 1
)
echo  Node.js trovato: %NODECHECK%
echo.

if not exist "node_modules\" (
    echo  Prima esecuzione: installazione dipendenze...
    echo  Questa operazione richiede internet e avviene una volta sola.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERRORE durante npm install. Controlla la connessione internet.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  Installazione completata!
    echo.
)

echo  Avvio in corso...
echo  Il browser si aprira' automaticamente su http://localhost:5173
echo  Per chiudere il gestionale chiudi questa finestra.
echo.
call npm run dev
