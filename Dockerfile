# Use Node.js
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g concurrently && npm install

# Copy all source code
COPY . .

# Expose both ports
EXPOSE 3000
EXPOSE 4000

# Run both server.js and Next.js
CMD ["concurrently", "node server.js", "npm start --prefix web"]
