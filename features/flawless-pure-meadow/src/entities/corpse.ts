export interface CorpseEntity {
  id: string;
  x: number;
  y: number;
  value: number; // 1 = regular, >1 = merged Charnel Pile
  radius: number;
  lifetime: number; // seconds before decay
}
