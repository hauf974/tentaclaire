import { expect, test } from '@playwright/test';
import { joinAsPlayer, launchGame, loginAdmin, resetGame, setConfig, uploadAndActivateTestImage } from './helpers.js';

test('partie complète : configuration admin, deux joueurs (pseudo doublonné), victoire visible sur les trois interfaces', async ({
  browser,
}) => {
  test.setTimeout(30_000);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAdmin(adminPage);
  await uploadAndActivateTestImage(adminPage);

  // Grille 5x5 + torche large (rayon 2) : deux déplacements suffisent à tout
  // révéler (case de départ centre-bas, chaque torche couvre 3 lignes).
  await setConfig(adminPage, {
    gridAuto: false,
    gridCols: 5,
    gridRows: 5,
    torchRadius: 2,
    ghostCount: 0,
    movementMode: 'chaos',
    chaosCooldownMs: 100,
    timerSeconds: 60,
  });
  await resetGame(adminPage);
  await launchGame(adminPage);
  await adminPage.waitForTimeout(300);

  const screenContext = await browser.newContext();
  const screenPage = await screenContext.newPage();
  await screenPage.goto('/screen');

  const player1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player1Page = await player1Context.newPage();
  await joinAsPlayer(player1Page, 'Testeur');

  const player2Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player2Page = await player2Context.newPage();
  await joinAsPlayer(player2Page, 'Testeur');

  // Suffixage J16 : le second joueur avec le même pseudo est renommé, la
  // manette l'affiche.
  await expect(player2Page.locator('.suffix-notice')).toContainText('Testeur_1');

  await player1Page.click('.btn.up');
  await player1Page.waitForTimeout(300);
  await player1Page.click('.btn.up');

  await expect(screenPage.locator('.message.big')).toContainText('Victoire', { timeout: 5000 });
  await expect(player1Page.locator('.phase-message')).toContainText('Victoire');
  await expect(player2Page.locator('.phase-message')).toContainText('Victoire');
  await expect(adminPage.locator('.badge').first()).toContainText('Victoire');

  await Promise.all([adminContext.close(), screenContext.close(), player1Context.close(), player2Context.close()]);
});
