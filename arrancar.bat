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

echo [1/4] Levantando PostgreSQL en puerto 5555...
rem Si el contenedor ya existe (aunque lo haya creado otro proyecto de compose), se reutiliza.
docker container inspect aegis_postgres > nul 2>&1
if %errorlevel% equ 0 (
    docker start aegis_postgres > nul
) else (
    docker compose up postgres -d
)
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: No se pudo levantar PostgreSQL.
    echo  Asegurate de que Docker Desktop este corriendo.
    echo.
    pause
    exit /b 1
)

echo [2/4] Esperando que la BD este lista...
timeout /t 8 /nobreak > nul

echo [3/4] Aplicando migraciones y datos iniciales...
for %%f in ("%BACKEND%\database\migrations\006*.sql" "%BACKEND%\database\migrations\007*.sql" "%BACKEND%\database\migrations\008*.sql" "%BACKEND%\database\migrations\009*.sql" "%BACKEND%\database\migrations\010*.sql" "%BACKEND%\database\migrations\011*.sql" "%BACKEND%\database\migrations\012*.sql") do (
    docker exec -i aegis_postgres psql -U aegis_app_user -d aegis_urban_db -1 -v ON_ERROR_STOP=1 < "%%~f" > nul 2>&1
)
docker exec -i aegis_postgres psql -U aegis_app_user -d aegis_urban_db < "%BACKEND%\database\seeds\001_initial_data.sql" > nul 2>&1
docker exec -i aegis_postgres psql -U aegis_app_user -d aegis_urban_db < "%BACKEND%\database\seeds\002_sprint3_data.sql" > nul 2>&1
echo  Datos iniciales OK (usuario: admin / Admin2026!)

node "%BACKEND%\scripts\crear-env.js"

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
