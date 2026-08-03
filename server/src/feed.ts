import type { Direction, FeedEntry } from '@tentaclaire/shared';

const FEED_MAX = 50;

export interface Feed {
  add(pseudo: string, direction: Direction, at: number): FeedEntry;
  list(): FeedEntry[];
}

/** Feed d'activité en mémoire (D1) : conserve les 50 dernières entrées. */
export function createFeed(): Feed {
  const entries: FeedEntry[] = [];
  let nextId = 1;

  return {
    add(pseudo, direction, at) {
      const entry: FeedEntry = { id: nextId++, pseudo, direction, at };
      entries.push(entry);
      if (entries.length > FEED_MAX) entries.shift();
      return entry;
    },
    list() {
      return [...entries];
    },
  };
}
