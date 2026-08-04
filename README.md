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

## Exploitation au bar, pas à pas

Une fois le serveur démarré (section précédente), pour monter une soirée sans documentation supplémentaire :

1. **Brancher l'écran/vidéoprojecteur** sur un PC ou une box connectée au même réseau que le serveur, ouvrir un navigateur en plein écran sur `http://<ip-du-serveur>:3000/screen` (cliquer sur l'écran ou appuyer sur `F` bascule en plein écran natif).
2. **Se connecter au dashboard admin** depuis un autre appareil (portable, tablette) : `http://<ip-du-serveur>:3000/admin`, saisir le mot de passe défini dans `.env` (`ADMIN_PASSWORD`).
3. **Configurer la partie** dans le dashboard :
   - *Réseau* : renseigner l'URL du QR Code (l'adresse `http://<ip-du-serveur>:3000/play` que les joueurs vont scanner) — le QR s'affiche immédiatement sur `/screen`.
   - *Galerie* : glisser-déposer l'image mystère du jour, cliquer « Utiliser ».
   - *Grille*, *Partie*, *Déplacements*, *Fantômes* : ajuster selon le public (grille plus petite et fantômes désactivés pour un groupe qui découvre le jeu, par exemple).
   - *Thème visuel* : choisir l'ambiance du soir (Carte du Maraudeur, Manoir hanté, Halloween, Cimetière, Néon).
4. **Lancer** : bouton « Réinitialiser » (prépare le plateau) puis « Lancer ». Le compte à rebours démarre.
5. **Faire scanner le QR Code** affiché sur l'écran géant : chaque joueur arrive directement sur l'écran pseudo (`/play`), choisit un nom, puis sa manette à quatre boutons.
6. Entre deux parties : « Réinitialiser » puis « Lancer » relance immédiatement avec la configuration en cours (les joueurs restent connectés, pas besoin de re-scanner).

Rappel (T4) : rien n'est persisté à part les images de la galerie — un redémarrage du serveur revient à la configuration par défaut.

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

Test de charge (50 joueurs simulés) : `npm run test:load` contre un serveur déjà lancé — voir `docs/charge.md` pour la méthode et le dernier rapport.

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

## Crédits

- **Polices** : IM Fell English, Caudex, Playfair Display, Creepster, Cormorant, Press Start 2P — Google Fonts, licence [SIL Open Font License 1.1](https://scripts.sil.org/OFL), embarquées au build via `@fontsource/*` (aucun CDN à l'exécution).
- **Sprites et textures** (personnage, fantômes, brouillard, quadrillage) : dessinés en primitives Canvas 2D, sans bibliothèque d'icônes ni asset externe.
