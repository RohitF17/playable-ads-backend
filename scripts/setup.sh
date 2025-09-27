#!/bin/bash

# Playable Ads Backend Setup Script
# This script helps you set up the development environment

set -e

echo "🎬 Playable Ads Backend Setup"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your AWS credentials and other settings"
    echo "   Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p temp
mkdir -p uploads

# Start infrastructure services (PostgreSQL and RabbitMQ)
echo "🚀 Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U playable_user -d playable_ads_db > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

# Check RabbitMQ
if docker-compose -f docker-compose.dev.yml exec -T rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; then
    echo "✅ RabbitMQ is ready"
else
    echo "❌ RabbitMQ is not ready"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your AWS credentials"
echo "2. Install dependencies: npm install"
echo "3. Run database migrations: npx prisma migrate deploy"
echo "4. Start the application: npm run dev"
echo "5. Start the worker: npm run start:worker"
echo ""
echo "Or use Docker for everything:"
echo "docker-compose up -d"
echo ""
echo "Services running:"
echo "- PostgreSQL: localhost:5432"
echo "- RabbitMQ Management: http://localhost:15672 (playable_user/playable_password)"
echo ""
echo "Happy coding! 🚀"
