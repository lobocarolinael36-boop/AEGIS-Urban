@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo  [AEGIS Urban] Deteniendo servicios...
echo.

docker compose stop postgres
echo  ✓ PostgreSQL detenido.

echo.
echo  Los servidores de Node se cierran cerrando sus ventanas de terminal.
echo.
pause
