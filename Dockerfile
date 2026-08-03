FROM node:22-alpine AS base
WORKDIR /app

# ---------- deps : installe tout (dev + prod), nécessaire pour builder ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

# ---------- build : shared -> client -> server ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- prod-deps : uniquement les dépendances de production ----------
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --omit=dev

# ---------- runtime : image finale minimale, utilisateur non-root ----------
FROM base AS runtime
ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/uploads

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data/uploads && chown -R node:node /app /data/uploads
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
