FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm --prefix backend install --production=false
RUN npm --prefix frontend install
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY krish_logo.png ./
COPY krish_logo_transparent.png ./
RUN npm --prefix frontend run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY backend/package.json ./backend/
RUN npm --prefix backend install --production
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/krish_logo.png ./
COPY --from=builder /app/krish_logo_transparent.png ./
COPY package.json ./
EXPOSE 5000
CMD ["node", "backend/server.js"]
