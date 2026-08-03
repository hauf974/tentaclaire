import { describe, expect, it } from 'vitest';
import { createFeed } from './feed.js';

describe('createFeed', () => {
  it('ajoute une entrée avec un id auto-incrémenté', () => {
    const feed = createFeed();
    const a = feed.add('Alex', 'up', 100);
    const b = feed.add('Bob', 'down', 200);
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(feed.list()).toEqual([a, b]);
  });

  it('ne conserve que les 50 dernières entrées', () => {
    const feed = createFeed();
    for (let i = 0; i < 60; i++) feed.add('Alex', 'up', i);
    const list = feed.list();
    expect(list).toHaveLength(50);
    expect(list[0]?.at).toBe(10); // les 10 plus anciennes ont été évincées
    expect(list[49]?.at).toBe(59);
  });

  it('list() renvoie une copie, pas la référence interne', () => {
    const feed = createFeed();
    feed.add('Alex', 'up', 0);
    const list = feed.list();
    list.pop();
    expect(feed.list()).toHaveLength(1);
  });
});
