# Image de production minimale, basée sur le build "standalone" de Next.js.
# Le dossier /app/data doit être monté sur un volume persistant (Railway
# Volumes, configuré depuis le dashboard — pas de VOLUME Docker : les
# builders Railway le refusent) : c'est là que vit le fichier SQLite
# contenant toutes les estimations.

FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 est un module natif : sa compilation (node-gyp) a besoin de
# Python et d'une chaîne de compilation C++, absentes de l'image "slim".
# Ces outils ne servent qu'au build ; l'étage "run" final reste léger.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Le serveur "standalone" de Next.js écoute sur $HOSTNAME s'il est défini, or
# Docker fixe automatiquement HOSTNAME à l'ID du conteneur pour tout process
# — sans ce override explicite, le serveur se lie à cette adresse interne
# au lieu de toutes les interfaces, et devient injoignable depuis
# l'extérieur du conteneur (le proxy de la plateforme d'hébergement, en
# particulier).
ENV HOSTNAME="0.0.0.0"

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
