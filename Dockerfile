# Use Node.js 18 Alpine for smaller image size
FROM node:18-slim
# Install FFmpeg and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fontconfig \
    fonts-dejavu \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

RUN mkdir -p /app/temp && chmod 777 /app/temp
# Generate Prisma client
RUN npx prisma generate
# RUN npx prisma migrate deploy
# Build the application
RUN npm run build

# Create logs directory
RUN mkdir -p logs

# Create temp directory for worker
RUN mkdir -p temp

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
