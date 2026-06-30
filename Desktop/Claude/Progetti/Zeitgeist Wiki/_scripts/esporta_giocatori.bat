@echo off
REM Genera il vault per i giocatori (Players/) dal vault Master.
cd /d "%~dp0"
python export_players.py %*
pause
