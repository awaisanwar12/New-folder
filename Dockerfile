# Use the official Node.js runtime as the base image
FROM node:16-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create a non-root user for security
RUN groupadd --gid 1001 --system nodejs && \
    useradd --uid 1001 --system --gid nodejs --shell /bin/bash --create-home tgc

# Change ownership of the app directory to the nodejs user
RUN chown -R tgc:nodejs /app
USER tgc

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"] 