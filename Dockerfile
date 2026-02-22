# Stage 1: build Angular
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar fuentes y construir
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: servir con nginx
FROM nginx:alpine

# Copiar artefactos de build
COPY --from=builder /app/dist/zentra/browser /usr/share/nginx/html

# Configuración nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint para inyectar API URL en runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
