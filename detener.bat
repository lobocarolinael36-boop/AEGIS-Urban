@echo off
cd /d "%~dp0"

echo.
echo  AEGIS Urban - Deteniendo servicios...
echo.

docker compose stop postgres
echo  PostgreSQL detenido.
echo.
echo  Cierra las ventanas del backend y frontend para detener Node.
echo.
pause
