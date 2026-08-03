# Tentaclaire

Jeu multijoueur local diffusé sur écran géant : une image mystère cachée sous un brouillard de guerre, révélée collectivement par les clients qui contrôlent un personnage unique depuis leur smartphone (scan de QR Code). Des fantômes errent sur le plateau et recouvrent les zones déjà explorées. Objectif : révéler un maximum de l'image avant la fin du compte à rebours.

Trois interfaces, une seule application :
- **`/screen`** — écran géant projeté (plateau, brouillard, timer, QR Code, feed d'activité)
- **`/play`** — manette smartphone (pseudo puis quatre boutons directionnels)
- **`/admin`** — dashboard de configuration et de pilotage (protégé par mot de passe)

## Prérequis

**Docker et Docker Compose uniquement.** Aucune installation de Node, npm ou autre sur l'hôte n'est nécessaire pour faire tourner l'application.

## Démarrage rapide (exploitation)

```bash
git clone https://github.com/hauf974/tentaclaire.git
cd tentaclaire
cp .env.example .env
# éditer .env : définir ADMIN_PASSWORD
docker compose up -d --build
curl -f http://localhost:3000/api/health
```

L'application est alors accessible sur `http://localhost:3000` (ou l'IP du serveur), en accès direct comme derrière un reverse proxy (URLs relatives, WebSocket same-origin).

## Développement (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Serveur (API + WebSocket) : `http://localhost:3000`
- Client Vite (HMR) : `http://localhost:5173`

## Tests

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

- Service `unit` : tests unitaires et d'intégration (Vitest)
- Service `e2e` : scénarios de bout en bout (Playwright)

## Variables d'environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `3000` | Port d'écoute du serveur |
| `ADMIN_PASSWORD` | *(à définir)* | Mot de passe du dashboard `/admin` |
| `PUBLIC_URL` | *(vide)* | Valeur initiale de l'URL du QR Code (modifiable dans l'admin) |
| `UPLOAD_DIR` | `/data/uploads` | Répertoire de stockage des images uploadées (volume Docker) |

Aucune base de données : toute la configuration et l'état de partie vivent en mémoire du serveur (un redémarrage repart des valeurs par défaut). Seules les images uploadées sont conservées entre redémarrages, via le volume Docker `uploads`.

## Structure du dépôt

Monorepo npm workspaces :
- `shared/` — types et contrat WebSocket partagés entre serveur et client
- `server/` — Fastify + Socket.IO, autorité exclusive du gameplay
- `client/` — Vue 3 + Vite, application unique (`/screen`, `/play`, `/admin`)
- `e2e/` — scénarios Playwright

Voir `SUIVI.md` pour l'avancement du développement et `DECISIONS.md` pour le journal des micro-décisions d'implémentation.
