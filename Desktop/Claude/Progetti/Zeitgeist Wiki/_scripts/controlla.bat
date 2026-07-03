@echo off
REM Lint del vault Master: convenzioni spoiler e coerenza (vedi controlla.py).
cd /d "%~dp0"
python controlla.py %*
pause
