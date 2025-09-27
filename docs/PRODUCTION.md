# Production Deployment Guide 🚀

This guide covers deploying the Playable Ads Backend to production environments.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Servers     │    │   Worker Nodes  │
│   (nginx/ALB)   │────│   (Multiple)      │    │   (Multiple)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   RabbitMQ      │
                       │   (Primary)     │    │   (Cluster)     │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   AWS S3        │
                       │   (Storage)     │
                       └─────────────────┘
```

## 🐳 Docker Production Setup

### 1. Production Dockerfile

Create `Dockerfile.prod`:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    fontconfig \
    ttf-dejavu \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create necessary directories
RUN mkdir -p logs temp uploads
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 2. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  # PostgreSQL with replication
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  # RabbitMQ cluster
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_ERLANG_COOKIE}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # API Server
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ${AWS_REGION}
      AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME}
      JWT_SECRET: ${JWT_SECRET}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      LOG_TO_FILE: true
      LOG_FILE_PATH: /app/logs/app.log
      FFMPEG_FONT_PATH: /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
    volumes:
      - ./logs:/app/logs
      - ./temp:/app/temp
    depends_on:
      - postgres
      - rabbitmq
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: "0.5"
        reservations:
          memory: 512M
          cpus: "0.25"

  # Worker Nodes
  worker:
    build:
      context: .
      dockerfile: Dockerfile.prod
    command: ["node", "dist/worker.js"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ${AWS_REGION}
      AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      LOG_TO_FILE: true
      LOG_FILE_PATH: /app/logs/worker.log
      FFMPEG_FONT_PATH: /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
    volumes:
      - ./logs:/app/logs
      - ./temp:/app/temp
    depends_on:
      - postgres
      - rabbitmq
    restart: unless-stopped
    deploy:
      replicas: 5
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
        reservations:
          memory: 1G
          cpus: "0.5"

  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  rabbitmq_data:
```

## 🔒 Security Configuration

### 1. Environment Variables

Create `.env.production`:

```env
# Database
POSTGRES_DB=playable_ads_prod
POSTGRES_USER=playable_prod_user
POSTGRES_PASSWORD=super-secure-password-here

# JWT
JWT_SECRET=your-super-secure-jwt-secret-256-bits

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-production-bucket

# RabbitMQ
RABBITMQ_USER=playable_prod_user
RABBITMQ_PASSWORD=super-secure-rabbitmq-password
RABBITMQ_ERLANG_COOKIE=super-secure-cookie

# Logging
LOG_LEVEL=INFO
```

### 2. Database Security

Create `postgresql.conf`:

```conf
# Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'

# Logging
log_statement = 'all'
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Performance
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 3. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app_servers {
        server app:8000;
        # Add more app instances for load balancing
        # server app2:8000;
        # server app3:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File uploads
        location /api/projects/ {
            limit_req zone=upload burst=5 nodelay;
            client_max_body_size 100M;
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://app_servers;
            access_log off;
        }
    }
}
```

## ☁️ Cloud Deployment

### AWS ECS Deployment

1. **Create ECS Cluster**:

```bash
aws ecs create-cluster --cluster-name playable-ads-cluster
```

2. **Create Task Definition**:

```json
{
  "family": "playable-ads-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/playable-ads:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:playable-ads/database"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/playable-ads",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

3. **Create Service**:

```bash
aws ecs create-service \
  --cluster playable-ads-cluster \
  --service-name playable-ads-service \
  --task-definition playable-ads-task:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: playable-ads-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: playable-ads-api
  template:
    metadata:
      labels:
        app: playable-ads-api
    spec:
      containers:
        - name: app
          image: your-registry/playable-ads:latest
          ports:
            - containerPort: 8000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: playable-ads-secrets
                  key: database-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: playable-ads-service
spec:
  selector:
    app: playable-ads-api
  ports:
    - port: 80
      targetPort: 8000
  type: LoadBalancer
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```javascript
// Add to your application
const prometheus = require("prom-client");

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
});

const activeJobs = new prometheus.Gauge({
  name: "active_jobs_total",
  help: "Number of active jobs",
});
```

### 2. Log Aggregation

Use ELK Stack or similar:

```yaml
# docker-compose.monitoring.yml
version: "3.8"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: playable-ads
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster playable-ads-cluster \
            --service playable-ads-service \
            --force-new-deployment
```

## 🚨 Backup & Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Create backup
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database/

# Cleanup old backups (keep last 30 days)
find . -name "backup_*.sql" -mtime +30 -delete
```

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Strategy**: Daily database backups, hourly log backups
4. **Recovery Process**:
   - Restore database from latest backup
   - Deploy application from container registry
   - Verify all services are running
   - Run health checks

## 📈 Performance Optimization

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX CONCURRENTLY idx_jobs_status ON jobs(status);
CREATE INDEX CONCURRENTLY idx_jobs_created_at ON jobs(created_at);
CREATE INDEX CONCURRENTLY idx_assets_project_id ON assets(project_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'PENDING';
```

### Application Optimization

```javascript
// Connection pooling
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Caching
const redis = require("redis");
const client = redis.createClient({
  url: process.env.REDIS_URL,
});

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

## 🔐 Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Implement proper authentication
- [ ] Use secrets management
- [ ] Enable database encryption
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Implement proper logging
- [ ] Use non-root containers
- [ ] Scan for vulnerabilities

## 📞 Support & Maintenance

### Health Checks

```bash
# Application health
curl -f http://localhost:8000/health || exit 1

# Database health
docker-compose exec postgres pg_isready -U $POSTGRES_USER

# RabbitMQ health
docker-compose exec rabbitmq rabbitmq-diagnostics ping
```

### Maintenance Windows

- **Database maintenance**: Weekly, 2 AM UTC
- **Application updates**: Bi-weekly, 6 PM UTC
- **Security patches**: As needed, emergency deployment
- **Backup verification**: Daily, automated

Remember: Production deployment is about reliability, security, and performance! 🎯
