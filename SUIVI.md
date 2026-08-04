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

## Lot 3 — Écran géant

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 3.1 | Connexion et état — useSocket, applyStateDelta, reconnexion | Terminé | 2026-08-03 | `fd729e0` |
| 3.2 | Renderer canvas — plateau, brouillard animé, letterbox/DPR | Terminé | 2026-08-03 | `f3725fd` |
| 3.3 | Rendu personnage et fantômes — interpolation, clignotement, sautillement | Terminé | 2026-08-03 | `4d50885` |
| 3.4 | Timer et superpositions de phase | Terminé | 2026-08-03 | `aaa503b` |
| 3.5 | Panneau QR Code | Terminé | 2026-08-03 | `0bf668f` |
| 3.6 | Panneau feed d'activité | Terminé | 2026-08-03 | `d7cab6a` |
| 3.7 | Plein écran et confort | Terminé | 2026-08-03 | `37f2f0f` |

Vérification navigateur : chaque ticket visuel vérifié via Chromium piloté (conteneur `mcr.microsoft.com/playwright` en `--network host`, pas d'accès root sur `serveur_dev` pour installer Chromium nativement — voir DECISIONS.md). Restent à vérifier humainement : rendu à distance façon écran de bar, fluidité perçue des animations, scan QR Code avec un vrai smartphone, rendu sur un vrai écran 4K.

## Lot 4 — Manette mobile

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 4.1 | Session et routage d'écrans — useSocket étendu (join/sendInput/ready), PublicConfig complété | Terminé | 2026-08-03 | `06f57d9` |
| 4.2 | Écran pseudo — champ, suffixage (J16) | Terminé | 2026-08-03 | `25fc0f3` |
| 4.3 | Manette — croix de 4 boutons, vibration, ergonomie tactile | Terminé | 2026-08-03 | `4968965` |
| 4.4 | Feedback cooldown et vote — anneau chaos, libellé démocratie | Terminé | 2026-08-03 | `a0584bb` |
| 4.5 | États de phase — reset/paused/victory/defeat | Terminé | 2026-08-03 | `16f94cd` |
| 4.6 | Reconnexion (vérification, aucun code nouveau) | Terminé | 2026-08-03 | `eedab1f` |

Vérification navigateur : chaque ticket vérifié via Chromium piloté (voir DECISIONS.md Lot 3), y compris un aller-retour serveur↔écran réel (feed d'activité) pour confirmer la réception des `input`, un cycle complet de phases piloté par l'admin REST (victoire/défaite déclenchées avec grille réduite/torche large et timer court), et une coupure réseau réelle simulée en gelant le process serveur (`kill -STOP`/`-CONT`) ~50s pour observer le bandeau de reconnexion et la reprise de session. Restent à vérifier humainement : test réel sur iPhone Safari et Android Chrome en 4G contre le serveur de dev, ergonomie « pouce » (une main), coupure réseau réelle (mode avion) sur appareil physique — cf. « Définition de terminé » de la fiche du lot.

## Lot 5 — Dashboard admin

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 5.1 | Authentification — login, déconnexion (route ajoutée), gate de session | Terminé | 2026-08-04 | `08fe8ee` |
| 5.2 | Pilotage live — badge/timer/joueurs, Lancer/Pause/Réinitialiser, correctif C6 sur `launch()` | Terminé | 2026-08-04 | `d0e633d` |
| 5.3 | Configuration réseau et partie — QR, durée du timer, `useAdminConfig` (débounce, pendingFields) | Terminé | 2026-08-04 | `3bc9b54` |
| 5.4 | Galerie et grille — upload/activation/suppression, correctif recalcul `gridRows`, proxy `/uploads` | Terminé | 2026-08-04 | `2fa171b` |
| 5.5 | Gameplay et fantômes — déplacements, torche, fantômes, collisions | Terminé | 2026-08-04 | `1f3ac11` |
| 5.6 | Thème et finitions — cartes de thème, quadrillages, correctif rendu Lot 3 sur le quadrillage par case | Terminé | 2026-08-04 | `356f490` |

Vérification navigateur : chaque ticket piloté depuis le dashboard lui-même (pas seulement `curl`), avec `/screen` ouvert en parallèle pour confirmer les effets croisés (QR, grille, quadrillage). Trois gaps pré-existants corrigés en cours de route (même catégorie que `qrUrl`/`PublicConfig` aux Lots 3-4) : `launch()` n'adoptait jamais de config (C6), `gridRows` ne se recalculait qu'à l'activation d'image, et un vrai bug de rendu Lot 3 où `showGridOnFog`/`showGridOnRevealed` n'étaient pas réellement indépendants (grille dessinée sous le brouillard visible en transparence). Restent à vérifier humainement : un exploitant néophyte configure et lance une partie complète sans documentation (jugement humain), utilisabilité tactile sur tablette réelle.

## Lot 6 — Thèmes visuels

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 6.1 | Infrastructure de thèmes — manifests, `useTheme`, polices `@fontsource`, `boardRenderer` paramétré | Terminé | 2026-08-04 | `78e0060` |
| 6.2 | Sprites communs (personnage) — silhouette D4 constante, variation de trait par thème | Terminé | 2026-08-04 | `58ab370` |
| 6.3 | Thème `maraudeur` (défaut) — parchemin moucheté, grille à l'encre, fantôme esquissé, traces de pas | Terminé | 2026-08-04 | `a7517c4` |
| 6.4 | Thème `manoir` — damas, fantôme drap classique | Terminé | 2026-08-04 | `b402d56` |
| 6.5 | Thème `halloween` — chauves-souris, grille ondulée cartoon, fantôme kawaii | Terminé | 2026-08-04 | `fc4b086` |
| 6.6 | Thème `cimetiere` — brume en dérive lente, fantôme spectre, correctif torche (couleur chaude) | Terminé | 2026-08-04 | `37e78fa` |
| 6.7 | Thème `neon` — grille glow, fantôme contour lumineux, flash de révélation | Terminé | 2026-08-04 | `bce6fae` |
| 6.8 | Vignettes du dashboard — captures réelles des 5 thèmes | Terminé | 2026-08-04 | `93b04cf` |

Vérification navigateur : chaque thème capturé via Chromium piloté sur une grille dédiée, `/screen` et `/play` ouverts en parallèle pour confirmer la bascule à chaud sur les deux surfaces. FPS mesuré sur 2s de `requestAnimationFrame` avec 20 fantômes sur les deux thèmes signalés coûteux par la fiche : `neon` 60,5 fps, `cimetiere` 60,3 fps. Un bug de rendu Lot 3 (quadrillage par état de case, cf. Lot 5) et une couleur de torche incohérente avec la fiche (`cimetiere`) corrigés en cours de route. Aucun asset copyrighté : sprites en primitives Canvas 2D originales, polices Google Fonts (SIL OFL) créditées dans `README.md`. Reste à vérifier humainement : validation visuelle des 5 thèmes par Arnaud (explicitement prévue par la fiche — captures fournies), ressenti de fluidité réel sur un vrai écran/projecteur de bar.

## Lots suivants

| Lot | Contenu | Statut |
|-----|---------|--------|
| Lot 7 | E2E, finitions et déploiement | À faire |
