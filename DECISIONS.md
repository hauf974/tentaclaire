# Journal des micro-décisions

Décisions d'implémentation non couvertes explicitement par le coffre Obsidian, choisies au fil de l'eau (option la plus simple, sans bloquer), conformément aux instructions du projet.

- **2026-08-03 (Lot 0, ticket 0.2)** — Valeurs par défaut de `GameConfig` non fixées par le coffre : `gridCols` = 10, `gridAuto` = true, `showGridOnFog` = true, `showGridOnRevealed` = true, `qrUrl` = chaîne vide. Consigné aussi dans le coffre (`00 - Projet/Questions ouvertes.md`, Q5).
- **2026-08-03 (Lot 0, ticket 0.4)** — `vue-router` fixé en version 4.x (pas la 5.x, qui introduit des peer-dependencies Pinia hors du périmètre décidé T2/T3 « rester simple »).
- **2026-08-03 (Lot 0, ticket 0.6)** — `docker-compose.yml`, `docker-compose.dev.yml` et `docker-compose.test.yml` déclarent chacun un nom de projet Compose distinct (`tentaclaire`, `tentaclaire-dev`, `tentaclaire-test`) pour éviter toute collision de conteneurs/réseaux entre exploitation, dev et tests.
