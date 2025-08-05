export const SCHOOLS = [
  'ESCEN',
  'Bachelor Institute', 
  'Magnum Institute',
  'Atlas Institute'
] as const;

export const CLASS_LEVELS = [
  'N1',
  'N2', 
  'N3'
] as const;

export type School = typeof SCHOOLS[number];
export type ClassLevel = typeof CLASS_LEVELS[number];