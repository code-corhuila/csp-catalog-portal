FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/csp-catalog-portal/browser /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider --quiet http://127.0.0.1/health || exit 1
