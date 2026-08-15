# Changelog

Historique du développement de Tentaclaire, lot par lot. Voir `SUIVI.md` pour le détail ticket par ticket et les commits, `DECISIONS.md` pour le journal des micro-décisions d'implémentation.

## Lot 0 — Socle technique
Monorepo npm workspaces (`shared`/`server`/`client`), squelette Fastify + Socket.IO, squelette Vue Router, Docker (exploitation, dev, test), documentation racine.

## Lot 1 — Moteur de jeu
Grille, phases et timer, déplacements (chaos et démocratie), fantômes (déplacement, recouvrement, IA de traque), collisions et invincibilité, condition de victoire. Couverture ≥ 90 % sur `server/src/engine/`, aucune dépendance à `Math.random()`/`Date.now()` non injectée.

## Lot 2 — Serveur temps réel
Boucle de tick 100 ms avec diffusion par diff d'état, sessions joueurs (tokens, pseudos suffixés, expiration 8 h), protocole WebSocket complet (joueur/écran/admin), authentification et configuration admin, galerie d'images, contrôles de session (lancer/pause/réinitialiser), robustesse (entrées hostiles, arrêt propre).

## Lot 3 — Écran géant
Vue `/screen` complète : connexion et état réactif, rendu canvas du plateau et du brouillard animé, personnage et fantômes interpolés, timer et superpositions de phase, panneau QR Code, feed d'activité, plein écran et confort visuel.

## Lot 4 — Manette mobile
Vue `/play` complète : session et routage d'écrans, écran de saisie du pseudo (avec suffixage en cas de doublon), manette à quatre boutons directionnels, retour visuel du cooldown/vote, états de phase, reconnexion transparente après coupure réseau.

## Lot 5 — Dashboard admin
Vue `/admin` complète : authentification, pilotage live (badge de phase, timer, boutons lancer/pause/réinitialiser), configuration réseau et partie, galerie et grille (upload, activation, suppression), gameplay et fantômes, thème et finitions. Plusieurs correctifs de fiabilité découverts en construisant le dashboard (config non réappliquée par `launch()`, recalcul de grille automatique incomplet, requêtes POST sans corps rejetées par le serveur).

## Lot 6 — Thèmes visuels
Cinq directions artistiques tranchées (Carte du Maraudeur, Manoir hanté, Halloween, Cimetière, Néon) sur l'écran géant et la manette, avec bascule à chaud depuis le dashboard. Sprites et textures en primitives Canvas 2D originales, polices Google Fonts embarquées. Vignettes réelles générées pour le dashboard.

## Lot 7 — E2E, finitions et déploiement
Suite Playwright multi-contextes (scénario nominal + cinq scénarios secondaires), test de charge réel (50 joueurs simulés, 5 minutes, latence p95 sous le seuil), finitions (favicon, page 404, titres d'onglet, revue du français, zéro erreur console), documentation finale. Correctif bloquant découvert en testant la build de production : absence de fallback SPA côté serveur, qui aurait cassé la navigation directe vers `/screen`, `/play` et `/admin` en exploitation réelle.

## Lot 8 — Retours de revue n°1
Trois retours de la revue humaine du 04/08/2026 : troisième comportement de fantôme « Extinction des feux » (attiré par la case révélée la plus proche), polices du panneau latéral de l'écran géant agrandies de 80 % pour la lisibilité à distance de bar, point de départ du personnage configurable dans l'admin (9 positions fixes plus une option « Aléatoire »).

## Lot 9 — Pilotage à chaud et test de charge intelligent
Pilotage en direct des réglages joueurs (`movementMode`, `chaosCooldownMs`, `democracyWindowMs`) et fantômes (`ghostCount`, `ghostSpeed`, `ghostBehavior`) depuis le dashboard admin, sans reload de page ni attendre le prochain Lancer/Réinitialiser (9.1). Test de charge (`scripts/loadTest.mjs`) étendu avec un pilotage intelligent des joueurs simulés — balayage systématique de la grille, case non découverte la plus proche, ou zone la plus dense en cases non découvertes, au lieu d'une direction aléatoire — et débranché de toute route admin pour rester utilisable en parallèle d'un pilotage manuel en direct, interruptible au Ctrl+C à tout moment (9.2). Correctif d'un biais de la stratégie « case la plus proche » qui faisait foncer les joueurs simulés vers un coin de la grille au lieu de la balayer, et ajout d'une stratégie de balayage systématique (9.3).
