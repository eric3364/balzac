/**
 * Convertit un numéro de niveau en nom de niveau texte
 */
export const getLevelName = (levelNumber: number): string => {
  const mapping: Record<number, string> = {
    1: 'élémentaire',
    2: 'intermédiaire',
    3: 'avancé'
  };
  return mapping[levelNumber] || 'élémentaire';
};

/**
 * Convertit un nom de niveau texte en numéro
 */
export const getLevelNumber = (levelName: string): number => {
  const mapping: Record<string, number> = {
    'élémentaire': 1,
    'intermédiaire': 2,
    'avancé': 3
  };
  return mapping[levelName.toLowerCase()] || 1;
};
