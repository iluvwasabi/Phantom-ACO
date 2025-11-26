@echo off
echo ========================================
echo ACO Service - Automated Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

echo [2/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [3/5] Checking environment configuration...
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo.
    echo WARNING: Please edit .env file with your Discord credentials!
    echo.
) else (
    echo .env file already exists
    echo.
)

echo [4/5] Generating secure keys...
call npm run generate-keys
echo.
echo Copy these keys to your .env file!
echo.
pause

echo [5/5] Initializing database...
call npm run init-db
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Edit .env file with your Discord credentials
echo 2. Set up Google Forms (see GOOGLE_FORMS_SETUP.md)
echo 3. Run: npm run dev (web server)
echo 4. Run: npm run bot (Discord bot)
echo.
echo For detailed instructions, see README.md
echo.
pause
