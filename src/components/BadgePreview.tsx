import { 
  Award, Star, Medal, Trophy, Crown, Gem, Shield, 
  Target, Zap, Heart, Flame, Sparkles, Diamond,
  Hexagon, Circle, Square, Triangle
} from 'lucide-react';

interface BadgePreviewProps {
  icon: string;
  color: string;
  backgroundColor: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const iconMap = {
  award: Award,
  star: Star,
  medal: Medal,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
  shield: Shield,
  target: Target,
  zap: Zap,
  heart: Heart,
  flame: Flame,
  sparkles: Sparkles,
  diamond: Diamond,
  hexagon: Hexagon,
  circle: Circle,
  square: Square,
  triangle: Triangle,
};

const sizeMap = {
  small: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  medium: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  large: { container: 'w-16 h-16', icon: 'w-8 h-8' },
};

export const BadgePreview = ({ 
  icon, 
  color, 
  backgroundColor, 
  size = 'medium', 
  className = '' 
}: BadgePreviewProps) => {
  const IconComponent = iconMap[icon as keyof typeof iconMap] || Award;
  const sizeClasses = sizeMap[size];

  return (
    <div 
      className={`
        ${sizeClasses.container} 
        rounded-full border-2 flex items-center justify-center
        shadow-lg transition-all duration-200 hover:scale-105
        ${className}
      `}
      style={{ 
        backgroundColor, 
        borderColor: color,
        boxShadow: `0 4px 12px ${color}20`
      }}
    >
      <IconComponent 
        className={sizeClasses.icon}
        style={{ color }}
      />
    </div>
  );
};

export const BadgeSelector = ({ 
  selectedIcon, 
  onIconSelect, 
  selectedColor,
  onColorSelect,
  selectedBgColor,
  onBgColorSelect
}: {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  selectedBgColor: string;
  onBgColorSelect: (color: string) => void;
}) => {
  const availableIcons = Object.keys(iconMap);
  const presetColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Icône du badge</label>
        <div className="grid grid-cols-6 gap-2 mt-2">
          {availableIcons.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => onIconSelect(iconName)}
              className={`
                p-2 rounded-lg border-2 transition-all hover:scale-105
                ${selectedIcon === iconName 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <BadgePreview
                icon={iconName}
                color={selectedColor}
                backgroundColor={selectedBgColor}
                size="small"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Couleur de l'icône</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => onColorSelect(e.target.value)}
              className="w-8 h-8 rounded border"
            />
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => onColorSelect(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border rounded"
              placeholder="#6366f1"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorSelect(color)}
                className="w-4 h-4 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Couleur de fond</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="color"
              value={selectedBgColor}
              onChange={(e) => onBgColorSelect(e.target.value)}
              className="w-8 h-8 rounded border"
            />
            <input
              type="text"
              value={selectedBgColor}
              onChange={(e) => onBgColorSelect(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border rounded"
              placeholder="#ffffff"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onBgColorSelect(color)}
                className="w-4 h-4 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-center">
        <label className="text-sm font-medium">Aperçu du badge</label>
        <div className="flex justify-center mt-2">
          <BadgePreview
            icon={selectedIcon}
            color={selectedColor}
            backgroundColor={selectedBgColor}
            size="large"
          />
        </div>
      </div>
    </div>
  );
};