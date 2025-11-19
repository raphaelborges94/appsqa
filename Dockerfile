# Stage 1: Build sqabi
FROM node:18 AS sqabi-builder
WORKDIR /app/sqabi
COPY sqabi/package*.json ./
RUN npm install
COPY sqabi/ ./
RUN npm run build

# Stage 2: Build sqahub frontend
FROM node:18 AS sqahub-frontend-builder
WORKDIR /app/sqahub
COPY sqahub/package*.json ./
COPY sqahub/vite.config.js ./
COPY sqahub/postcss.config.cjs ./
COPY sqahub/tailwind.config.js ./
COPY sqahub/jsconfig.json ./
COPY sqahub/index.html ./
RUN npm install
COPY sqahub/src ./src
RUN npm run build

# Stage 3: Setup sqahub backend
FROM node:18 AS sqahub-backend-setup
WORKDIR /app/sqahub-backend
COPY sqahub/src/backend/package*.json ./
RUN npm install
COPY sqahub/src/backend/ ./

# Stage 4: Final image
FROM node:18
WORKDIR /app

# Install pm2
RUN npm install -g pm2

# Copy built frontends
COPY --from=sqabi-builder /app/sqabi/dist /app/sqabi/dist
COPY --from=sqahub-frontend-builder /app/sqahub/dist /app/sqahub/dist

# Copy sqabi backend with node_modules
COPY --from=sqabi-builder /app/sqabi /app/sqabi

# Copy sqahub backend with node_modules
COPY --from=sqahub-backend-setup /app/sqahub-backend /app/sqahub-backend

# Copy static server
COPY sqabi/server /app/sqabi/server
COPY sqahub/src/backend /app/sqahub-backend

# Expose ports
# 5173: sqahub-frontend (served by sqahub-backend)
# 5174: sqabi-backend
# 3000: sqahub-backend
EXPOSE 5173 5174 3000

# Start all services with pm2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
