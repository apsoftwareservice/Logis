# Use Node.js
FROM node:20-alpine

WORKDIR /app

# Needed for some native binaries on Alpine
RUN apk add --no-cache libc6-compat

# Install dependencies with clean lockfile-based install
COPY package*.json ./
RUN npm ci

# Copy source AFTER deps so node_modules isn't overwritten
COPY . .

# Build Next.js (and your server bundle)
RUN npm run build

# Expose both ports
EXPOSE 3000
EXPOSE 4000

# Prefer npx so we don't need global installs
CMD ["npx", "concurrently", "node dist/server.js", "npm start"]
