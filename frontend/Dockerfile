# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS build

WORKDIR /app

# Avval package.json (cache uchun)
COPY package*.json ./
RUN npm ci --silent

# Keyin kod
COPY . .
RUN npm run build

# ================================
# Stage 2: Nginx
# ================================
FROM nginx:alpine

# Build natijasini ko'chirish
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx konfiguratsiya (SPA uchun)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
