import React from 'react';
import { Star, Trophy, Medal, Crown, Award, Shield, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificationBadgeProps {
  icon?: string;
  color?: string;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  isObtained?: boolean;
  level?: number;
  className?: string;
  animated?: boolean;
  customUrl?: string;
}

// Mapping des icônes disponibles
const iconMap: Record<string, React.ComponentType<any>> = {
  star: Star,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  award: Award,
  shield: Shield,
  zap: Zap,
  target: Target,
};

// Tailles des badges
const sizeMap = {
  small: {
    container: 'w-12 h-12',
    icon: 16,
    border: 'border-2'
  },
  medium: {
    container: 'w-16 h-16',
    icon: 24,
    border: 'border-3'
  },
  large: {
    container: 'w-24 h-24',
    icon: 32,
    border: 'border-4'
  }
};

export const CertificationBadge: React.FC<CertificationBadgeProps> = ({
  icon = 'star',
  color = '#6366f1',
  backgroundColor = '#ffffff',
  size = 'medium',
  isObtained = false,
  level,
  className,
  animated = false,
  customUrl
}) => {
  const IconComponent = iconMap[icon] || Star;
  const sizeConfig = sizeMap[size];

  return (
    <div className="relative group">
      {/* Badge principal */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          sizeConfig.container,
          sizeConfig.border,
          {
            "grayscale opacity-50": !isObtained,
            "animate-pulse": animated && isObtained,
            "hover:scale-110 hover:rotate-6": animated,
            "shadow-lg": isObtained,
            "shadow-md": !isObtained
          },
          className
        )}
        style={{
          backgroundColor: isObtained ? backgroundColor : '#f3f4f6',
          borderColor: isObtained ? color : '#d1d5db',
          boxShadow: isObtained ? `0 4px 20px ${color}33` : undefined
        }}
      >
        {/* Image personnalisée ou icône */}
        {customUrl ? (
          <img
            src={customUrl}
            alt="Badge personnalisé"
            key={`badge-img-${customUrl}`} // Force le re-render quand l'URL change
            className={cn(
              "transition-all duration-300 object-contain rounded-full",
              sizeConfig.container,
              {
                "grayscale opacity-50": !isObtained,
                "drop-shadow-sm": isObtained
              }
            )}
            style={{
              filter: isObtained ? 'none' : 'grayscale(100%) opacity(0.5)'
            }}
          />
        ) : (
          <IconComponent
            size={sizeConfig.icon}
            style={{
              color: isObtained ? color : '#9ca3af',
            }}
            className={cn(
              "transition-all duration-300",
              {
                "drop-shadow-sm": isObtained
              }
            )}
          />
        )}

        {/* Effet de brillance pour les badges obtenus */}
        {isObtained && (
          <div 
            className="absolute inset-0 rounded-full opacity-20 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`
            }}
          />
        )}

        {/* Numéro du niveau */}
        {level && isObtained && (
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: color }}
          >
            {level}
          </div>
        )}
      </div>

      {/* Effet de halo au survol pour les badges obtenus */}
      {isObtained && animated && (
        <div 
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm"
          style={{
            backgroundColor: color,
            transform: 'scale(1.2)'
          }}
        />
      )}

      {/* Particules d'animation pour les nouveaux badges */}
      {isObtained && animated && (
        <>
          <div 
            className="absolute -top-1 -left-1 w-2 h-2 rounded-full animate-bounce"
            style={{ 
              backgroundColor: color,
              animationDelay: '0s',
              animationDuration: '1.5s'
            }}
          />
          <div 
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-bounce"
            style={{ 
              backgroundColor: color,
              animationDelay: '0.5s',
              animationDuration: '1.5s'
            }}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full animate-bounce"
            style={{ 
              backgroundColor: color,
              animationDelay: '1s',
              animationDuration: '1.5s'
            }}
          />
        </>
      )}
    </div>
  );
};

export default CertificationBadge;