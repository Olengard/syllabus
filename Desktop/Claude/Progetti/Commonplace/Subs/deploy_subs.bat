@echo off
SET PATH=C:\Users\Test\AppData\Roaming\npm;C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\Test\Desktop\Claude\Progetti\Commonplace\Subs"
node.exe "C:\Users\Test\AppData\Roaming\npm\node_modules\vercel\dist\index.js" --prod --yes
