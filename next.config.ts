import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 est un module natif : on le laisse en dépendance externe
  // plutôt que de le faire bundler, pour que son binaire compilé reste
  // utilisable tel quel (en dev comme dans le build "standalone" ci-dessous).
  serverExternalPackages: ["better-sqlite3"],
  // Build autonome (inclut son propre node_modules minimal) : simplifie le
  // déploiement via Docker, sans dépendre d'un `npm install` sur le serveur.
  output: "standalone",
};

export default nextConfig;
