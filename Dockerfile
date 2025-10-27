# Use Node.js
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g concurrently && npm install

# Copy all source code
COPY . .

# Build Next.js
RUN npm run build

# Expose both ports
EXPOSE 3000
EXPOSE 4000

# Run both dist/server.js and Next.js
CMD ["concurrently", "node dist/server.js", "npm start"]
