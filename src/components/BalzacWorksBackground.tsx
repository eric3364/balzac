import { useMemo } from 'react';

// Liste des principales œuvres d'Honoré de Balzac
const BALZAC_WORKS = [
  "Le Père Goriot",
  "Eugénie Grandet",
  "Illusions perdues",
  "La Cousine Bette",
  "Le Cousin Pons",
  "La Peau de chagrin",
  "Le Lys dans la vallée",
  "Splendeurs et misères des courtisanes",
  "La Femme de trente ans",
  "Le Colonel Chabert",
  "La Duchesse de Langeais",
  "La Recherche de l'absolu",
  "César Birotteau",
  "Les Chouans",
  "Une ténébreuse affaire",
  "La Rabouilleuse",
  "Ursule Mirouët",
  "Pierrette",
  "Le Médecin de campagne",
  "Le Curé de village",
  "Louis Lambert",
  "Séraphîta",
  "La Messe de l'athée",
  "Gobseck",
  "Le Chef-d'œuvre inconnu",
  "Sarrasine",
  "Gambara",
  "Massimilla Doni",
  "Modeste Mignon",
  "Béatrix",
  "Honorine",
  "Albert Savarus",
  "La Maison du Chat-qui-pelote",
  "Le Bal de Sceaux",
  "Mémoires de deux jeunes mariées",
  "Une fille d'Ève",
  "La Vendetta",
  "Une double famille",
  "La Paix du ménage",
  "Madame Firmiani",
  "Étude de femme",
  "La Fausse Maîtresse",
  "Les Secrets de la princesse de Cadignan",
  "Ferragus",
  "La Fille aux yeux d'or",
  "Histoire des Treize",
  "Le Cabinet des Antiques",
  "Les Paysans",
  "Le Curé de Tours",
  "L'Illustre Gaudissart",
  "La Muse du département",
  "Le Contrat de mariage",
  "Un début dans la vie",
  "La Maison Nucingen",
  "Les Employés",
  "Le Député d'Arcis",
  "Z. Marcas",
  "Un prince de la bohème",
  "Les Petits Bourgeois",
  "L'Envers de l'histoire contemporaine",
];

interface WorkPosition {
  title: string;
  x: number;
  y: number;
  fontSize: number;
  opacity: number;
  rotation: number;
  isItalic: boolean;
}

export const BalzacWorksBackground = () => {
  const works = useMemo(() => {
    const positions: WorkPosition[] = [];
    const shuffled = [...BALZAC_WORKS].sort(() => Math.random() - 0.5);
    
    // Créer des positions pour environ 40 titres
    for (let i = 0; i < Math.min(40, shuffled.length); i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      
      positions.push({
        title: shuffled[i],
        x: (col * 12.5) + (Math.random() * 6 - 3) + 2,
        y: (row * 18) + (Math.random() * 8 - 4) + 5,
        fontSize: 1.1 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.10,
        rotation: Math.random() * 16 - 8,
        isItalic: Math.random() > 0.5,
      });
    }
    
    return positions;
  }, []);

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0"
      style={{ perspective: '1000px' }}
    >
      <div 
        className="absolute inset-0"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: 'rotateX(5deg)',
        }}
      >
        {works.map((work, index) => (
          <span
            key={index}
            className={`absolute font-playfair text-primary whitespace-nowrap ${work.isItalic ? 'italic' : ''}`}
            style={{
              left: `${work.x}%`,
              top: `${work.y}%`,
              fontSize: `${work.fontSize}rem`,
              opacity: work.opacity,
              transform: `rotate(${work.rotation}deg) translateZ(${-50 + index * 2}px)`,
              fontWeight: Math.random() > 0.5 ? 500 : 400,
            }}
          >
            {work.title}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BalzacWorksBackground;
