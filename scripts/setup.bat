@echo off
REM Playable Ads Backend Setup Script for Windows
REM This script helps you set up the development environment

echo 🎬 Playable Ads Backend Setup
echo ==============================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first:
    echo    https://docs.docker.com/desktop/windows/install/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first:
    echo    https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from .env.example...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your AWS credentials and other settings
    echo    Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME
) else (
    echo ✅ .env file already exists
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist logs mkdir logs
if not exist temp mkdir temp
if not exist uploads mkdir uploads

REM Start infrastructure services (PostgreSQL and RabbitMQ)
echo 🚀 Starting infrastructure services...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your AWS credentials
echo 2. Install dependencies: npm install
echo 3. Run database migrations: npx prisma migrate deploy
echo 4. Start the application: npm run dev
echo 5. Start the worker: npm run start:worker
echo.
echo Or use Docker for everything:
echo docker-compose up -d
echo.
echo Services running:
echo - PostgreSQL: localhost:5432
echo - RabbitMQ Management: http://localhost:15672 (playable_user/playable_password)
echo.
echo Happy coding! 🚀
pause
