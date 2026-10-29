FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx (same image and port as csp-auth-portal and
# csp-concessions-portal: nginx:alpine listening on 80, published as 4203:80)
FROM nginx:alpine

# Copy custom nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# The CORS rule is rendered from the container environment at startup (ADR-026)
COPY deploy/runtime/cors-origin.conf.template /opt/csp-runtime/cors-origin.conf.template
COPY deploy/runtime/40-render-cors.sh /docker-entrypoint.d/40-render-cors.sh
RUN chmod +x /docker-entrypoint.d/40-render-cors.sh

# Copy built assets from builder stage
COPY --from=build /app/dist/csp-catalog-portal/browser /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
