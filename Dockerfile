# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install FFmpeg and other dependencies
RUN apk add --no-cache \
    ffmpeg \
    fontconfig \
    ttf-dejavu \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

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
