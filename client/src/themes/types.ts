import type { ThemeId } from '@tentaclaire/shared';

export type FogStyle = 'flat' | 'parchment' | 'damask' | 'cartoon' | 'drift' | 'neon';
export type GridStyle = 'thin' | 'irregular-ink' | 'thin-gold' | 'cartoon-wavy' | 'thin-cold' | 'neon-glow';
export type GhostShape = 'sketch' | 'sheet' | 'kawaii' | 'spectre' | 'neon-outline';
export type CharacterLineStyle = 'plain' | 'sketchy' | 'glow';
export type RevealEffect = 'fade' | 'flash';

export interface ThemeColors {
  background: string;
  fogFill: string;
  fogFillSecondary: string;
  grid: string;
  characterFill: string;
  characterAccent: string;
  torchFlame: string;
  ghostFill: string;
  ghostAccent: string;
}

export interface ThemeManifest {
  id: ThemeId;
  label: string;
  colors: ThemeColors;
  fontDisplay: string;
  fontBody: string;
  fogStyle: FogStyle;
  gridStyle: GridStyle;
  ghostShape: GhostShape;
  characterLineStyle: CharacterLineStyle;
  revealEffect: RevealEffect;
}
