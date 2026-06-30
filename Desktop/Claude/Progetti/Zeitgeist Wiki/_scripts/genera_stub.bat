@echo off
REM Crea pagine-segnaposto per ogni collegamento [[...]] non ancora scritto.
cd /d "%~dp0"
python genera_stub.py %*
pause
