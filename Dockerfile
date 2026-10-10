# syntax=docker/dockerfile:1

# ---- Build: compila TypeScript con todas las dependencias ----
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Deja solo las dependencias de producción para la imagen final
RUN npm prune --omit=dev

# ---- Runtime: imagen mínima, usuario sin privilegios ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

# Render/Railway inyectan PORT; 3000 es el valor por defecto de main.ts
EXPOSE 3000
CMD ["node", "dist/main.js"]
