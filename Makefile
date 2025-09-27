# Playable Ads Backend Makefile
# Common commands for development and deployment

.PHONY: help install dev build start stop clean logs test lint format

# Default target
help:
	@echo "🎬 Playable Ads Backend"
	@echo "======================"
	@echo ""
	@echo "Development:"
	@echo "  make install     Install dependencies"
	@echo "  make dev         Start development environment"
	@echo "  make build       Build the application"
	@echo "  make test        Run tests"
	@echo "  make lint        Run linter"
	@echo "  make format      Format code"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-dev  Start development with Docker"
	@echo "  make docker-prod Start production with Docker"
	@echo "  make docker-build Build Docker images"
	@echo "  make docker-stop Stop all containers"
	@echo "  make docker-clean Clean up Docker resources"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate  Run database migrations"
	@echo "  make db-reset    Reset database"
	@echo "  make db-studio   Open Prisma Studio"
	@echo ""
	@echo "Utilities:"
	@echo "  make logs        View application logs"
	@echo "  make clean       Clean up temporary files"

# Development
install:
	@echo "📦 Installing dependencies..."
	npm install

dev:
	@echo "🚀 Starting development server..."
	npm run dev

build:
	@echo "🔨 Building application..."
	npm run build

test:
	@echo "🧪 Running tests..."
	npm test

lint:
	@echo "🔍 Running linter..."
	npx eslint src/ --ext .ts,.js

format:
	@echo "✨ Formatting code..."
	npx prettier --write src/

# Docker Development
docker-dev:
	@echo "🐳 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development services started!"
	@echo "   PostgreSQL: localhost:5432"
	@echo "   RabbitMQ: http://localhost:15672"

docker-prod:
	@echo "🐳 Starting production environment..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started!"

docker-build:
	@echo "🔨 Building Docker images..."
	docker-compose build

docker-stop:
	@echo "🛑 Stopping all containers..."
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.prod.yml down

docker-clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker system prune -f
	docker volume prune -f

# Database
db-migrate:
	@echo "🗄️ Running database migrations..."
	npx prisma migrate deploy

db-reset:
	@echo "🔄 Resetting database..."
	npx prisma migrate reset --force

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	npx prisma studio

# Utilities
logs:
	@echo "📋 Viewing application logs..."
	docker-compose logs -f app worker

clean:
	@echo "🧹 Cleaning up temporary files..."
	rm -rf dist/
	rm -rf logs/*.log
	rm -rf temp/*
	rm -rf uploads/*

# Setup
setup:
	@echo "🎬 Setting up Playable Ads Backend..."
	@if [ -f scripts/setup.sh ]; then \
		chmod +x scripts/setup.sh && ./scripts/setup.sh; \
	else \
		echo "📝 Creating .env file..."; \
		cp .env.example .env; \
		echo "📁 Creating directories..."; \
		mkdir -p logs temp uploads; \
		echo "✅ Setup complete! Please edit .env file with your credentials."; \
	fi

# Health checks
health:
	@echo "🏥 Checking service health..."
	@echo "API Health:"
	@curl -s http://localhost:8000/health | jq . || echo "❌ API not responding"
	@echo ""
	@echo "Database Health:"
	@docker-compose exec postgres pg_isready -U playable_user -d playable_ads_db || echo "❌ Database not responding"
	@echo ""
	@echo "RabbitMQ Health:"
	@docker-compose exec rabbitmq rabbitmq-diagnostics ping || echo "❌ RabbitMQ not responding"

# Production deployment
deploy:
	@echo "🚀 Deploying to production..."
	@echo "⚠️  Make sure you have configured production environment variables!"
	docker-compose -f docker-compose.prod.yml up -d --build
	@echo "✅ Production deployment complete!"

# Backup
backup:
	@echo "💾 Creating database backup..."
	@DATE=$$(date +%Y%m%d_%H%M%S); \
	docker-compose exec postgres pg_dump -U playable_user playable_ads_db > backup_$$DATE.sql; \
	echo "✅ Backup created: backup_$$DATE.sql"

# Restore
restore:
	@echo "🔄 Restoring database from backup..."
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Please specify backup file: make restore FILE=backup_20240101_120000.sql"; \
		exit 1; \
	fi
	docker-compose exec -T postgres psql -U playable_user playable_ads_db < $(FILE)
	@echo "✅ Database restored from $(FILE)"
