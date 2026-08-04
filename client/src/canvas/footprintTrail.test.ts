import { describe, expect, it } from 'vitest';
import { createFootprintTrail } from './footprintTrail.js';

describe('createFootprintTrail', () => {
  it('ne produit aucune trace tant que la case ne change pas', () => {
    const trail = createFootprintTrail();
    trail.update({ col: 3, row: 5 }, 0, true);
    trail.update({ col: 3, row: 5 }, 100, true);
    expect(trail.getMarks(100)).toEqual([]);
  });

  it('enregistre une trace à la case précédente quand la case logique change', () => {
    const trail = createFootprintTrail();
    trail.update({ col: 3, row: 5 }, 0, true);
    trail.update({ col: 3, row: 4 }, 100, true);
    const marks = trail.getMarks(100);
    expect(marks).toHaveLength(1);
    expect(marks[0]?.pos).toEqual({ col: 3, row: 5 });
  });

  it("l'opacité décroît avec le temps jusqu'à disparaître", () => {
    const trail = createFootprintTrail();
    trail.update({ col: 0, row: 0 }, 0, true);
    trail.update({ col: 0, row: 1 }, 0, true);
    const fresh = trail.getMarks(0)[0]?.alpha ?? 0;
    const older = trail.getMarks(750)[0]?.alpha ?? 0;
    expect(older).toBeLessThan(fresh);
    expect(trail.getMarks(2000)).toEqual([]);
  });

  it('limite le nombre de traces conservées', () => {
    const trail = createFootprintTrail();
    for (let i = 0; i < 10; i++) {
      trail.update({ col: i, row: 0 }, i * 10, true);
    }
    expect(trail.getMarks(100).length).toBeLessThanOrEqual(6);
  });

  it('enabled=false vide immédiatement les traces (thèmes sans effet)', () => {
    const trail = createFootprintTrail();
    trail.update({ col: 0, row: 0 }, 0, true);
    trail.update({ col: 0, row: 1 }, 100, true);
    expect(trail.getMarks(100)).toHaveLength(1);

    trail.update({ col: 0, row: 1 }, 200, false);
    expect(trail.getMarks(200)).toEqual([]);
  });
});
