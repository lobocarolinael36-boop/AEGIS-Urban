@echo off
chcp 65001 > nul
cd /d "%~dp0"

set "RAIZ=%~dp0"
set "BACKEND=%~dp0aegis-urban-backend"
set "FRONTEND=%~dp0aegis-urban-frontend"

echo.
echo  =========================================
echo   AEGIS Urban - Arranque
echo  =========================================
echo.

echo [1/4] Levantando PostgreSQL...
docker compose up postgres -d
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: No se pudo levantar PostgreSQL.
    echo  Asegurate de que Docker Desktop este corriendo.
    echo.
    pause
    exit /b 1
)

echo [2/4] Esperando que la BD este lista...
timeout /t 6 /nobreak > nul

echo [3/4] Cargando datos iniciales...
docker exec -i aegis_postgres psql -U aegis_app_user -d aegis_urban_db < "%BACKEND%\database\seeds\001_initial_data.sql" > nul 2>&1
echo  Datos iniciales OK (usuario: admin / Admin2026!)

if not exist "%BACKEND%\node_modules" (
    echo  Instalando dependencias del backend...
    cd /d "%BACKEND%"
    npm install
    cd /d "%RAIZ%"
)

if not exist "%FRONTEND%\node_modules" (
    echo  Instalando dependencias del frontend...
    cd /d "%FRONTEND%"
    npm install
    cd /d "%RAIZ%"
)

echo [4/4] Iniciando servidores...

start "AEGIS Backend  puerto 3001" cmd /k "cd /d "%BACKEND%" && npm run dev"

timeout /t 3 /nobreak > nul

start "AEGIS Frontend puerto 5173" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo  Listo! Se abrieron 2 ventanas nuevas.
echo  Backend:  http://localhost:3001/api/health
echo  Frontend: http://localhost:5173
echo  Usuario:  admin / Admin2026!
echo.
pause
