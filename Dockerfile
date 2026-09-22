FROM node:20-alpine

WORKDIR /app

# Install build tools needed to compile better-sqlite3 native module
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy backend package.json and install dependencies
COPY backend/package.json ./backend/package.json
RUN npm --prefix backend install

# Copy all project files
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "backend/server.js"]
