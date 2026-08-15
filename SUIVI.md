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

## Lot 7 — E2E, finitions et déploiement

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 7.4a | Correctif SPA fallback (bloquant) — `setNotFoundHandler`, route 404 Vue Router | Terminé | 2026-08-04 | `55d5689` |
| 7.1 | Scénario E2E nominal — configuration admin, deux joueurs, victoire sur les 3 surfaces | Terminé | 2026-08-04 | `21e7e74` |
| 7.2 | Scénarios E2E secondaires — défaite, démocratie, pause/reprise, reconnexion, collision mortelle | Terminé | 2026-08-04 | `0fd6c5b` |
| 7.3 | Test de charge — 50 joueurs, 5 min, p95 = 97ms, `docs/charge.md` | Terminé | 2026-08-04 | `9dda8eb` |
| 7.4b | Finitions — favicon, endpoint de session (zéro erreur console), relecture français | Terminé | 2026-08-04 | `5250ad0` |
| 7.5 | Documentation finale — README exploitation au bar, `DECISIONS.md` relu/complété, `CHANGELOG.md` | Terminé | 2026-08-04 | `7e9bc1d` |
| 7.7 | (Optionnel) GitHub Actions — lint + build + test sur push/PR | Terminé | 2026-08-04 | `14c38b5` |
| 7.6 | Déploiement `serveur_dev` — `docker compose up -d --build`, healthcheck vert | Terminé | 2026-08-04 | — (`.env`, non versionné) |

Découverte critique en préparant ce lot : la build de production (`node server/dist/index.js`, jamais testée en navigation directe jusqu'ici — tous les lots précédents vérifiaient via le serveur dev Vite, qui a son propre fallback SPA) renvoyait un 404 brut sur `/screen`, `/play`, `/admin` en navigation directe — bloquant pour le déploiement puisque le QR Code pointe vers une URL absolue. Corrigé en tout premier (7.4a) avant le reste du lot. Suite E2E complète (7/7, nominal + 5 secondaires) verte et stable sur plusieurs exécutions dans `docker-compose.test.yml`. Test de charge réel (pas simulé) : 50 joueurs, 5 minutes, p95 = 97 ms (< 200 ms), zéro déconnexion, mémoire stable.

**Déploiement réel (7.6)** : confirmé par Arnaud (mot de passe admin choisi par lui, écrit dans `.env` non versionné). `docker compose up -d --build` exécuté sur `serveur_dev` (ce répertoire) — conteneur `tentaclaire-app-1` `healthy`, `curl -f http://localhost:3000/api/health` OK, `/screen`/`/play`/`/admin` vérifiés 200 en navigation directe, login admin vérifié. `PUBLIC_URL` dans `.env.example` n'est pas encore câblé côté code (documentaire uniquement, décision Lot 0) : l'URL du QR Code doit être renseignée manuellement dans le dashboard admin après déploiement. Reste à faire : partie réelle jouée par Arnaud depuis son smartphone en 4G (test humain final, acceptation explicite du ticket).

Tous les lots de développement (0 à 7, hors déploiement 7.6) sont terminés. Il ne reste que le déploiement réel sur `serveur_dev` (7.6), en attente de confirmation.

## Lot 8 — Retours de revue n°1

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 8.1 | IA fantôme « Extinction des feux » (R1) — comportement `extinction` dans `engine/ghosts.ts`, radio admin | Terminé | 2026-08-05 | `c8ee705` |
| 8.2 | Écran géant : polices du panneau latéral ×1,8 (R2) — `QrPanel.vue`, `FeedPanel.vue` | Terminé | 2026-08-05 | `fb77d48` |
| 8.3 | Point de départ configurable (R3) — 9 positions fixes + « Aléatoire » (10ᵉ option confirmée), `startPosition` dans `GameConfig` | Terminé | 2026-08-05 | `c047ba0` |

Trois retours de la revue humaine du 04/08/2026 (décisions R1–R3), mis en œuvre sans refonte sur l'application déjà livrée. `npm run lint` propre et suite complète verte (227 tests) après chaque ticket. Vérification navigateur pour 8.2 (Chromium piloté, conteneur `mcr.microsoft.com/playwright:v1.62.1-noble` en `--network host`, méthode du Lot 3) : panneau latéral agrandi sans débordement horizontal (`scrollWidth === clientWidth`), feed lisible et défilant. Vérification manuelle de bout en bout (8.1 + 8.3 combinés) : partie réelle en comportement `extinction` avec point de départ `center` sur une grille 8×8 — personnage effectivement au centre, fantôme visiblement attiré vers la zone révélée. Interface admin vérifiée par capture d'écran : sélecteur 3×3 du point de départ avec pictogrammes, radio « Extinction des feux » avec explication. Déployé sur `serveur_dev` (`docker compose up -d --build`, conteneur `healthy`).

**Correctifs post-déploiement (05/08/2026, retour utilisateur)** — commit `20dd42e` : (1) la zone révélée d'office au départ n'attire plus les fantômes en `extinction` (elle aurait sinon systématiquement attiré les fantômes sur le point d'apparition dès le début de partie, `startZoneIndices` désormais exclue de `chooseNextTarget`) ; (2) le point de départ `random` tire désormais une case uniforme sur toute la grille (`resolveStartingPosition`), et non plus parmi les 9 positions fixes ; (3) la radio « Aléatoire » de l'admin reprend le style exact des 9 autres (pictogramme avec « ? »). 230 tests verts, suite Docker (unit + e2e) verte, redéployé sur `serveur_dev`.

Tous les lots (0 à 8) sont terminés.

## Lot 9 — Pilotage à chaud (déplacements et fantômes)

| Ticket | Description | Statut | Date | Commit |
|--------|--------------|--------|------|--------|
| 9.1 | Pilotage à chaud joueurs/fantômes — `GameEngine.updateConfig()`, `LIVE_ENGINE_FIELDS`, ajustement live de `ghostCount` sans reset | Terminé | 2026-08-14 | `772e817` |
| 9.2 | Test de charge intelligent (`nearest`/`density`), sans appel admin, interruptible au Ctrl+C | Terminé | 2026-08-14 | `b230bad` |
| 9.3 | Correctif biais `nearest` (tirage au sort des égalités) + nouvelle stratégie `sweep` | Terminé | 2026-08-14 | `8a48c30` |

Demande directe d'Arnaud (hors lot planifié) : pouvoir modifier `movementMode`/`chaosCooldownMs`/`democracyWindowMs` (joueurs) et `ghostCount`/`ghostSpeed`/`ghostBehavior` (fantômes) à la volée depuis le dashboard admin, sans reload de page ni attendre le prochain Lancer/Réinitialiser. Architecture déjà prête côté protocole temps réel (Socket.IO, `state_delta`, `config_changed` déjà écoutés côté client) — seule la logique serveur limitait ces six champs au régime C6 (« au prochain reset/launch »). `ghostCount` est le seul cas non trivial : les fantômes n'étaient spawnés qu'à `reset()` ; nouvelle fonction interne `adjustGhostCount()` qui ajoute (ids décalés après le maximum existant, jamais de collision) ou retire (troncature) des fantômes du moteur en cours, sans toucher à ceux déjà en jeu. `npm run lint` propre et suite complète verte (244 tests, dont 11 nouveaux ciblant précisément le pilotage à chaud : bascule chaos/démocratie en cours de partie, non-rétroactivité d'un cooldown/fenêtre déjà engagé, vitesse/comportement des fantômes appliqués dès le tick suivant, ajout/retrait de fantômes sans perturber les autres, utilisable avant tout reset). Appliqué et validé sur `serveur_dev` avant push.

**9.2 (même journée, suite directe)** : Arnaud a précisé deux exigences pour le test de charge (`scripts/loadTest.mjs`, ticket 7.3) avant de l'utiliser contre la production : (1) le script ne doit JAMAIS toucher aux routes admin — il doit rester un simple essaim de « téléphones », pour laisser l'exploitant piloter/modifier la partie en direct (y compris via le pilotage à chaud du 9.1) pendant le test ; (2) le test doit être interruptible au Ctrl+C à tout moment, sans rien à restaurer puisqu'il ne modifie plus rien. `BOT_STRATEGY=nearest|density` ajouté : un connecteur d'observation dédié (rôle `screen`, sans authentification) suit l'état réel de la partie et calcule la direction à viser (case non découverte la plus proche, ou bloc de grille le plus dense en cases non découvertes) ; tous les joueurs simulés votent cette même direction, cohérent avec le personnage unique et partagé du jeu. Validé sur `serveur_dev` : progression du taux de révélation cohérente en quelques secondes pour les deux stratégies, arrêt propre au Ctrl+C vérifié (0 déconnexion inattendue rapportée après correctif). Destiné à être lancé depuis la machine personnelle d'Arnaud contre `https://revelio.ltn.re`, aucun mot de passe requis (rôles `player`/`screen` non authentifiés).

**9.3 (même journée, retour d'usage réel)** : après avoir essayé `nearest` depuis sa machine Windows, Arnaud remonte que « la stratégie des joueurs simulés a pas l'air très efficace ». Bug trouvé dans `nearestUnrevealedTarget()` : le tie-break gardait systématiquement la première case à distance égale rencontrée en parcourant la grille ligne par ligne depuis le haut-gauche — avec `torchRadius` à 0, les 4 voisins immédiats sont quasi toujours à égalité de distance, donc le personnage fonçait systématiquement vers le coin haut-gauche puis longeait le mur du haut au lieu de balayer la grille. Corrigé (tirage au sort parmi les cases à distance minimale). Nouvelle stratégie `BOT_STRATEGY=sweep` ajoutée : balayage systématique ligne par ligne façon tondeuse à gazon, couverture complète sans angle mort. Validé sur `serveur_dev` (grille 20×20, `ghostCount=0`) : `sweep` et `nearest` (corrigé) progressent tous deux de façon quasi linéaire et identique (~1,5 % toutes les 3 s), confirmant que le bug était la cause principale du problème remonté, pas un défaut du concept. Documentation ajoutée en tête de script sur deux facteurs indépendants de la stratégie qui limitent souvent plus la vitesse de révélation : le cooldown chaos (une seule entrée retenue par fenêtre, peu importe le nombre de votants) et `torchRadius` (0 = une seule case révélée par pas).
