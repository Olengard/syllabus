@echo off
cd /d "%~dp0app"
set PATH=%PATH%;C:\Program Files\nodejs
echo Avvio Syllabus (vercel dev: frontend + proxy AI) su http://localhost:3000
npx vercel dev --listen 3000
pause
