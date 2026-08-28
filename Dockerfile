# Image de production minimale, basée sur le build "standalone" de Next.js.
# Le dossier /app/data doit être monté sur un volume persistant : c'est là
# que vit le fichier SQLite contenant toutes les estimations.

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]
