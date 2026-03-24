/**
 * MiiColorPalette — palettes de couleurs étendues Switch
 *
 * Source : mii-creator (datkat21) — src/constants/ColorTables.ts
 * SwitchMiiColorTable : 100 couleurs utilisées pour tous les éléments
 * colorisables dans l'éditeur Switch (corps, cheveux, yeux, etc.)
 */

// ─── Palette étendue Switch (100 couleurs) ────────────────────────────────────
// Identique à SwitchMiiColorTable dans mii-creator.
// Index 0–99, hex strings CSS.

export const SWITCH_BODY_COLORS: readonly string[] = [
  // Bruns / châtains (0–7)
  '#2d2828', '#402010', '#5c180a', '#7c3a14',
  '#787880', '#4e3e10', '#885818', '#d0a04a',
  // Noirs / gris (8–9)
  '#000000', '#6c7070',
  // Terre (10–14)
  '#663c2c', '#605e30', '#4654a8', '#387058', '#603810',
  // Rouges (15–19)
  '#a81008', '#203068', '#a86000', '#787068', '#d85208',
  // Rouges vifs / roses (20–27)
  '#f00c08', '#f54848', '#f09a74', '#8c5040',
  '#842626', '#ff7366', '#ffa6a6', '#ffc0ba',
  // Bordeaux / roses foncés (28–37)
  '#732e3b', '#991f3d', '#8a173e', '#b53e42',
  '#c71e56', '#b05381', '#c7546e', '#fa7597',
  '#fcacc9', '#ffc9d8',
  // Violets (38–47)
  '#311c40', '#37283d', '#4c184d', '#6f42b3',
  '#855cb8', '#c083cc', '#a893c9', '#c5ace6',
  '#eebefa', '#d2c5ed',
  // Bleus foncés / marines (48–55)
  '#191f40', '#123f66', '#2a82d4', '#57b4f2',
  '#7ac5de', '#89a6fa', '#84bdfa', '#a1e3ff',
  // Teals / cyans (56–63)
  '#0b2e36', '#013d3b', '#0d4f59', '#236663',
  '#307e8c', '#4faeb0', '#7ac49e', '#7fd4c0',
  // Vert menthe / turquoise (64–66)
  '#87e5b6', '#0a4a35', '#437a00',
  // Verts (67–75)
  '#027562', '#369970', '#4bad1a', '#92bf0a',
  '#63c788', '#9ee042', '#96de7e', '#bbf2aa',
  // Kaki / olive (76–83)
  '#99932b', '#a69563', '#ccc039', '#ccb987',
  '#d9cc82', '#d5d96f', '#d5e683', '#d8fa9d',
  // Oranges / caramel (84–91)
  '#7d4500', '#e6bb7a', '#fee24a', '#fade82',
  '#f7ea9c', '#faf89b', '#a64d1e', '#ff960d',
  // Pêches (92–95)
  '#d19b69', '#ffb266', '#ffc28c', '#e5cfb1',
  // Gris / blancs (96–99)
  '#414141', '#9b9b9b', '#bebebe', '#dcd7cd',
  // Blanc pur (100 → index 99 = '#dcd7cd', ajout)
  '#ffffff',
] as const

/** Nombre de couleurs disponibles dans la palette Switch */
export const SWITCH_BODY_COLORS_COUNT = SWITCH_BODY_COLORS.length

/**
 * Retourne une couleur hex aléatoire de la palette Switch.
 * Utile dans coherentMiiData / randomMiiData quand customColors = true.
 */
export function randomSwitchColor(): string {
  return SWITCH_BODY_COLORS[Math.floor(Math.random() * SWITCH_BODY_COLORS_COUNT)]!
}
