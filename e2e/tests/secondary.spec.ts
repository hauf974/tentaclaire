import { expect, test } from '@playwright/test';
import { joinAsPlayer, launchGame, loginAdmin, pauseGame, resetGame, setConfig } from './helpers.js';

test.describe('scénarios E2E secondaires (ticket 7.2)', () => {
  test('a) défaite par timer : "Trop tard !" sur écran et manette', async ({ browser }) => {
    test.setTimeout(20_000);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await setConfig(adminPage, {
      gridAuto: false,
      gridCols: 5,
      gridRows: 5,
      ghostCount: 0,
      timerSeconds: 10,
    });
    await resetGame(adminPage);
    await launchGame(adminPage);

    const screenContext = await browser.newContext();
    const screenPage = await screenContext.newPage();
    await screenPage.goto('/screen');

    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const playerPage = await playerContext.newPage();
    await joinAsPlayer(playerPage, 'DefaiteTest');

    await expect(screenPage.locator('.message.big')).toContainText('Trop tard', { timeout: 15_000 });
    await expect(playerPage.locator('.phase-message')).toContainText('Trop tard');

    await Promise.all([adminContext.close(), screenContext.close(), playerContext.close()]);
  });

  test('b) mode démocratie : votes contradictoires résolus sans blocage', async ({ browser }) => {
    test.setTimeout(20_000);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await setConfig(adminPage, {
      gridAuto: false,
      gridCols: 10,
      gridRows: 10,
      ghostCount: 0,
      movementMode: 'democratie',
      democracyWindowMs: 300,
      timerSeconds: 60,
    });
    await resetGame(adminPage);
    await launchGame(adminPage);

    const screenContext = await browser.newContext();
    const screenPage = await screenContext.newPage();
    await screenPage.goto('/screen');

    const player1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const player1Page = await player1Context.newPage();
    await joinAsPlayer(player1Page, 'VoteUp');
    await expect(player1Page.locator('.vote-label')).toBeVisible();

    const player2Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const player2Page = await player2Context.newPage();
    await joinAsPlayer(player2Page, 'VoteDown');

    // Votes contradictoires (égalité 1-1) : la partie doit rester jouable, quel
    // que soit le tirage au sort du départage côté moteur (déjà testé
    // unitairement, Lot 1 — l'E2E vérifie juste l'absence de blocage).
    await player1Page.click('.btn.up');
    await player2Page.click('.btn.down');
    await player1Page.waitForTimeout(600); // > democracyWindowMs, la fenêtre se résout

    await expect(screenPage.locator('.feed')).toContainText('VoteUp');
    await expect(screenPage.locator('.feed')).toContainText('VoteDown');
    // Le jeu reste "running" (aucune superposition de phase) après le départage.
    await expect(screenPage.locator('.message.big')).toHaveCount(0);

    // Un nouvel input après le départage est toujours accepté (le moteur n'est pas bloqué).
    await player1Page.click('.btn.left');
    await player1Page.waitForTimeout(400);
    await expect(screenPage.locator('.feed')).toContainText('VoteUp a appuyé sur');

    await Promise.all([adminContext.close(), screenContext.close(), player1Context.close(), player2Context.close()]);
  });

  test('c) pause puis reprise en cours de partie', async ({ browser }) => {
    test.setTimeout(20_000);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await setConfig(adminPage, {
      gridAuto: false,
      gridCols: 10,
      gridRows: 10,
      ghostCount: 0,
      movementMode: 'chaos',
      timerSeconds: 60,
    });
    await resetGame(adminPage);
    await launchGame(adminPage);

    const screenContext = await browser.newContext();
    const screenPage = await screenContext.newPage();
    await screenPage.goto('/screen');

    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const playerPage = await playerContext.newPage();
    await joinAsPlayer(playerPage, 'PauseTest');
    await playerPage.click('.btn.up');
    await playerPage.waitForTimeout(300);

    await pauseGame(adminPage);
    await expect(screenPage.locator('.overlay.veil .message')).toContainText('Pause');
    await expect(playerPage.locator('.phase-message')).toContainText('Pause');
    await expect(playerPage.locator('.btn.up')).toBeDisabled();

    await launchGame(adminPage); // reprendre (paused -> running)
    await expect(playerPage.locator('.btn.up')).toBeEnabled();
    await expect(playerPage.locator('.phase-message')).toHaveCount(0);

    await Promise.all([adminContext.close(), screenContext.close(), playerContext.close()]);
  });

  test('d) reconnexion joueur : rechargement de page -> même pseudo restauré', async ({ browser }) => {
    test.setTimeout(15_000);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await setConfig(adminPage, { gridAuto: false, gridCols: 10, gridRows: 10, ghostCount: 0, timerSeconds: 60 });
    await resetGame(adminPage);
    await launchGame(adminPage);

    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const playerPage = await playerContext.newPage();
    await joinAsPlayer(playerPage, 'ReconnexionTest');
    const pseudoBefore = await playerPage.locator('.pseudo').textContent();

    await playerPage.reload({ waitUntil: 'networkidle' });

    await expect(playerPage.locator('.controller')).toBeVisible();
    await expect(playerPage.locator('.pseudo')).toHaveText(pseudoBefore ?? '');

    await Promise.all([adminContext.close(), playerContext.close()]);
  });

  test('e) collision mortelle : réapparition après capture par un fantôme traqueur', async ({ browser }) => {
    test.setTimeout(20_000);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await setConfig(adminPage, {
      gridAuto: false,
      gridCols: 5,
      gridRows: 5,
      ghostCount: 1,
      ghostSpeed: 5,
      ghostBehavior: 'traque',
      collisionMode: 'mortel_reapparition',
      timerSeconds: 60,
    });
    await resetGame(adminPage);
    await launchGame(adminPage);

    const screenContext = await browser.newContext();
    const screenPage = await screenContext.newPage();
    await screenPage.goto('/screen');

    await expect(screenPage.locator('.feed')).toContainText('attrapé', { timeout: 15_000 });

    await Promise.all([adminContext.close(), screenContext.close()]);
  });
});
