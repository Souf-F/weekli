# Image de developpement de Weekli, partagee par les deux services de docker-compose.yml
FROM node:22-slim AS base
WORKDIR /app

# Dependances d'abord, pour profiter du cache Docker tant que les package.json ne changent pas
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .

# Dans le conteneur on ecoute sur 0.0.0.0 ; docker-compose ne publie les ports que sur 127.0.0.1

# Front React servi par Vite, avec rechargement a chaud
FROM base AS web
EXPOSE 5173
CMD ["npm", "run", "dev:docker", "--workspace", "@weekli/web"]

# Worker Cloudflare (MCP, OAuth, API) via wrangler dev ; il sert aussi le front compile
FROM base AS server
RUN npm run build
EXPOSE 8788
CMD ["npm", "run", "dev:docker", "--workspace", "@weekli/server"]
