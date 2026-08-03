# Suivi d'avancement

Tableau de bord du développement de Tentaclaire, tenu à jour ticket par ticket.

## Lot 0 — Socle technique

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 0.1 | Init monorepo npm workspaces | Terminé | 2026-08-03 | `45adde8` |
| 0.2 | Paquet `shared` | Terminé | 2026-08-03 | `5c89e67` |
| 0.3 | Squelette serveur Fastify + Socket.IO | Terminé | 2026-08-03 | `247cd29` |
| 0.4 | Squelette client Vue Router | Terminé | 2026-08-03 | `8825238` |
| 0.5 | Docker exploitation | Terminé | 2026-08-03 | `122f409` |
| 0.6 | Docker dev et test | Terminé | 2026-08-03 | `916bfc4` |
| 0.7 | Documentation racine | Terminé | 2026-08-03 | `643e8e3` |

## Lot 1 — Moteur de jeu

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 1.1 | Grille — index, case de départ, torche, révélation | Terminé | 2026-08-03 | `0e6f85c` |
| 1.2 | Phases et timer | Terminé | 2026-08-03 | `6e66c43` |
| 1.3 | Déplacement mode Chaos | Terminé | 2026-08-03 | `0a35864` |
| 1.4 | Déplacement mode Démocratie | Terminé | 2026-08-03 | `069dce0` |
| 1.5 | Fantômes — déplacement et recouvrement | Terminé | 2026-08-03 | `a913b22` |
| 1.6 | Fantômes — IA traque | Terminé | 2026-08-03 | `d62720b` |
| 1.7 | Collisions et invincibilité | Terminé | 2026-08-03 | `26e75f1` |
| 1.8 | Victoire, intégration, couverture (100 % lignes sur `engine/`) | Terminé | 2026-08-03 | `4ef1191` |

## Lot 2 — Serveur temps réel

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 2.1 | Boucle serveur — tick 100ms, diff d'état, composition root testable | Terminé | 2026-08-03 | `1027443` |
| 2.2 | Sessions joueurs — tokens, pseudos suffixés, expiration 8h | Terminé | 2026-08-03 | `a1c85f6` |
| 2.3 | Protocole joueur et écran — hello, join, input, feed_add | Terminé | 2026-08-03 | `06333a2` |
| 2.4 | Authentification et config admin — login, cookie, GET/PUT config | Terminé | 2026-08-03 | `189b693` |
| 2.5 | Galerie d'images — upload, magic bytes, dimensions, activation | Terminé | 2026-08-03 | `c9e1863` |
| 2.6 | Contrôles de session — launch/pause/reset REST + snapshot | Terminé | 2026-08-03 | `49a49f7` |
| 2.7 | Robustesse — handlers protégés, SIGTERM propre, logs, fuzzing | Terminé | 2026-08-03 | `030b734` |

Vérification manuelle de fin de lot (definition of done) : partie jouable de bout en bout sur le conteneur de production réel — `curl` pour l'auth/config/contrôles admin, script `socket.io-client` pour un joueur (hello → join → input → déplacement confirmé par `state_delta`).

## Lots suivants

| Lot | Contenu | Statut |
|-----|---------|--------|
| Lot 3 | Écran géant | À faire |
| Lot 4 | Manette mobile | À faire |
| Lot 5 | Dashboard admin | À faire |
| Lot 6 | Thèmes visuels | À faire |
| Lot 7 | E2E, finitions et déploiement | À faire |
