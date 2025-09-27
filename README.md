# Playable Ads Backend 🎬

A robust backend service for processing video ads with FFmpeg rendering, built with Node.js, TypeScript, and Docker.

## 🚀 Quick Start with Docker

The easiest way to get started is using Docker Compose. This will set up everything you need in one command.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (2.0+)
- An AWS account for S3 storage

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd playable-ads-backend
```

### 2. Environment Configuration

Copy the example environment file and fill in your AWS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# AWS S3 Configuration (REQUIRED)
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name

# Optional: Override defaults
JWT_SECRET=your-super-secret-jwt-key
LOG_LEVEL=INFO
```

### 3. Start Everything

```bash
docker-compose up -d
```

This will start:

- **PostgreSQL** database on port 5432
- **RabbitMQ** message broker on ports 5672 (AMQP) and 15672 (Management UI)
- **Main API** server on port 8000
- **Worker** process for video rendering

### 4. Initialize Database

Run the database migrations:

```bash
docker-compose exec app npx prisma migrate deploy
```

### 5. Verify Everything Works

Check the health endpoint:

```bash
curl http://localhost:8000/health
```

You should see:

```json
{
  "status": "ok",
  "time": "2024-01-01T00:00:00.000Z"
}
```

## 📋 Manual Setup (Without Docker)

If you prefer to run everything locally without Docker:

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+
- **RabbitMQ** 3.12+
- **FFmpeg** with font support
- **AWS CLI** configured

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE playable_ads_db;
CREATE USER playable_user WITH PASSWORD 'playable_password';
GRANT ALL PRIVILEGES ON DATABASE playable_ads_db TO playable_user;
```

### 3. Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://playable_user:playable_password@localhost:5432/playable_ads_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# AWS S3
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# RabbitMQ
RABBITMQ_URL="amqp://localhost"

# Server
PORT=8000

# Logging
LOG_LEVEL=INFO
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/app.log

# FFmpeg
FFMPEG_FONT_PATH="/path/to/your/font.ttf"
```

### 4. Database Migration

```bash
npx prisma migrate deploy
```

### 5. Start Services

In separate terminals:

```bash
# Start the main API
npm run dev

# Start the worker process
npm run start:worker
```

## 🔧 AWS S3 Setup

### 1. Create an S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `your-company-playable-ads`)
4. Select your preferred region
5. Keep default settings for now

### 2. Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Username: `playable-ads-s3-user`
4. Select "Programmatic access"

### 3. Attach S3 Policy

Create a new policy with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

Replace `your-bucket-name` with your actual bucket name.

### 4. Get Access Keys

1. After creating the user, go to "Security credentials"
2. Click "Create access key"
3. Choose "Application running outside AWS"
4. Copy the Access Key ID and Secret Access Key
5. Add them to your `.env` file

## 🎥 FFmpeg Setup

### Docker (Automatic)

FFmpeg is automatically installed in the Docker container with font support.

### Manual Installation

#### macOS

```bash
brew install ffmpeg
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

#### Windows

1. Download from [FFmpeg.org](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your PATH

### Font Configuration

The app uses fonts for text overlay on videos. Set the `FFMPEG_FONT_PATH` environment variable:

#### Linux/macOS

```bash
# Find available fonts
fc-list | grep -i dejavu

# Common paths:
# /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
# /System/Library/Fonts/Arial.ttf (macOS)
```

#### Windows

```bash
# Common Windows font paths:
# C:\Windows\Fonts\arial.ttf
# C:\Windows\Fonts\calibri.ttf
```

## 📊 Monitoring and Logs

### Docker Logs

View logs from all services:

```bash
docker-compose logs -f
```

View specific service logs:

```bash
docker-compose logs -f app
docker-compose logs -f worker
```

### Application Logs

Logs are stored in the `./logs` directory:

- `app.log` - Main application logs
- `worker.log` - Worker process logs

### RabbitMQ Management

Access the RabbitMQ management UI at:

- URL: http://localhost:15672
- Username: `playable_user`
- Password: `playable_password`

## 🔍 API Documentation

Once running, visit:

- **API Docs**: http://localhost:8000/api-docs
- **Health Check**: http://localhost:8000/health

### Key Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /projects` - Create project
- `POST /projects/:id/assets` - Upload asset
- `POST /projects/:id/render` - Start render job
- `GET /job/:id` - Check job status

## 🛠️ Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Start with hot reload
npm run dev

# Start worker separately
npm run start:worker
```

### Database Management

```bash
# View database
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your-migration-name
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres
```

#### 2. RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access management UI
open http://localhost:15672
```

#### 3. S3 Upload Failures

- Verify AWS credentials in `.env`
- Check bucket permissions
- Ensure bucket exists in the correct region

#### 4. FFmpeg Errors

```bash
# Test FFmpeg installation
docker-compose exec app ffmpeg -version

# Check font path
docker-compose exec app ls -la /usr/share/fonts/truetype/dejavu/
```

#### 5. Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs worker

# Verify RabbitMQ queue
# Go to http://localhost:15672 and check the "render_jobs" queue
```

### Performance Tuning

#### Database

- Increase `shared_buffers` in PostgreSQL
- Add database indexes for frequently queried fields

#### Worker

- Scale worker instances: `docker-compose up --scale worker=3`
- Adjust `channel.prefetch(1)` in worker.ts for concurrent processing

#### S3

- Use S3 Transfer Acceleration for faster uploads
- Implement S3 lifecycle policies for cost optimization

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Configure proper S3 bucket policies
- [ ] Set up proper logging and monitoring
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Enable database encryption at rest
- [ ] Configure firewall rules

### Environment Variables Security

Never commit `.env` files to version control. Use:

- `.env.example` for documentation
- Environment-specific files (`.env.production`, `.env.staging`)
- Secrets management services in production

## 📈 Scaling

### Horizontal Scaling

Scale worker instances:

```bash
docker-compose up --scale worker=5
```

### Load Balancing

Use a reverse proxy (nginx, Traefik) to distribute API requests across multiple app instances.

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Database sharding for very large datasets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs
3. Check Docker container status: `docker-compose ps`
4. Verify all environment variables are set correctly
5. Ensure all external services (S3, database) are accessible

For additional help, please open an issue in the repository.
