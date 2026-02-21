# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Build-time env vars for Vite (VITE_* prefix required)
ARG VITE_DEBATE_BOARD_API_URL
ARG VITE_DEBATE_BOARD_WS_URL
ARG VITE_USER_SERVICE_API_URL

RUN npm run build

# ---- Run stage ----
FROM nginx:alpine

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Remove the default nginx config that conflicts
RUN rm -f /etc/nginx/conf.d/default.conf.default 2>/dev/null || true

COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run uses port 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
