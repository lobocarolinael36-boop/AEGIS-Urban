@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         AEGIS Urban — Arranque           ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 1. PostgreSQL con Docker
echo [1/3] Levantando PostgreSQL...
docker compose up postgres -d
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: No se pudo levantar PostgreSQL.
    echo  Asegurate de que Docker Desktop este corriendo.
    pause
    exit /b 1
)

:: ── 2. Esperar que la BD este lista
echo [2/3] Esperando que la BD este lista ^(5 seg^)...
timeout /t 5 /nobreak > nul

:: ── 3. Instalar dependencias si faltan
if not exist "%~dp0aegis-urban-backend\node_modules" (
    echo  Instalando dependencias del backend por primera vez...
    cd /d "%~dp0aegis-urban-backend"
    call npm install
    cd /d "%~dp0"
)

if not exist "%~dp0aegis-urban-frontend\node_modules" (
    echo  Instalando dependencias del frontend por primera vez...
    cd /d "%~dp0aegis-urban-frontend"
    call npm install
    cd /d "%~dp0"
)

:: ── 4. Abrir Backend en ventana nueva
echo [3/3] Iniciando Backend y Frontend...
start "AEGIS Backend  :3001" cmd /k "cd /d "%~dp0aegis-urban-backend" && npm run dev"

:: Pequeña pausa para que el backend arranque antes del frontend
timeout /t 3 /nobreak > nul

:: ── 5. Abrir Frontend en ventana nueva
start "AEGIS Frontend :5173" cmd /k "cd /d "%~dp0aegis-urban-frontend" && npm run dev"

echo.
echo  ✓ Todo iniciado. Se abrieron 2 ventanas:
echo    Backend  →  http://localhost:3001/api/health
echo    Frontend →  http://localhost:5173
echo.
echo  Para detener: cerra las ventanas y ejecuta detener.bat
echo.
pause
