import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import CertificationBadge from './CertificationBadge';

interface BadgeConfigurationProps {
  initialConfig: {
    badge_icon: string;
    badge_color: string;
    badge_background_color: string;
    badge_size: string;
  };
  onConfigChange: (config: {
    badge_icon: string;
    badge_color: string;
    badge_background_color: string;
    badge_size: string;
  }) => void;
  levelNumber?: number;
}

const iconOptions = [
  { value: 'star', label: 'Étoile ⭐' },
  { value: 'trophy', label: 'Trophée 🏆' },
  { value: 'medal', label: 'Médaille 🥇' },
  { value: 'crown', label: 'Couronne 👑' },
  { value: 'award', label: 'Récompense 🏅' },
  { value: 'shield', label: 'Bouclier 🛡️' },
  { value: 'zap', label: 'Éclair ⚡' },
  { value: 'target', label: 'Cible 🎯' },
];

const sizeOptions = [
  { value: 'small', label: 'Petit' },
  { value: 'medium', label: 'Moyen' },
  { value: 'large', label: 'Grand' },
];

const colorPresets = [
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Vert', value: '#22c55e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Turquoise', value: '#06b6d4' },
];

export const BadgeConfiguration: React.FC<BadgeConfigurationProps> = ({
  initialConfig,
  onConfigChange,
  levelNumber = 1
}) => {
  const [config, setConfig] = useState(initialConfig);

  const handleConfigChange = (newConfig: Partial<typeof config>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange(updatedConfig);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎨 Configuration du Badge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prévisualisation */}
        <div className="text-center space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Aperçu du badge</h4>
          <div className="flex justify-center items-center gap-8 p-6 bg-muted/20 rounded-lg">
            {/* Badge non obtenu */}
            <div className="text-center space-y-2">
              <CertificationBadge
                icon={config.badge_icon}
                color={config.badge_color}
                backgroundColor={config.badge_background_color}
                size={config.badge_size as 'small' | 'medium' | 'large'}
                isObtained={false}
                level={levelNumber}
              />
              <p className="text-xs text-muted-foreground">Non obtenu</p>
            </div>

            {/* Badge obtenu */}
            <div className="text-center space-y-2">
              <CertificationBadge
                icon={config.badge_icon}
                color={config.badge_color}
                backgroundColor={config.badge_background_color}
                size={config.badge_size as 'small' | 'medium' | 'large'}
                isObtained={true}
                level={levelNumber}
                animated={true}
              />
              <p className="text-xs text-muted-foreground">Obtenu</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuration de l'icône */}
        <div className="space-y-3">
          <Label htmlFor="badge-icon">Icône du badge</Label>
          <Select 
            value={config.badge_icon} 
            onValueChange={(value) => handleConfigChange({ badge_icon: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une icône" />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Configuration de la taille */}
        <div className="space-y-3">
          <Label htmlFor="badge-size">Taille du badge</Label>
          <Select 
            value={config.badge_size} 
            onValueChange={(value) => handleConfigChange({ badge_size: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une taille" />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Configuration des couleurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Couleur principale */}
          <div className="space-y-3">
            <Label htmlFor="badge-color">Couleur de l'icône</Label>
            <div className="flex gap-2">
              <Input
                id="badge-color"
                type="color"
                value={config.badge_color}
                onChange={(e) => handleConfigChange({ badge_color: e.target.value })}
                className="w-12 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                value={config.badge_color}
                onChange={(e) => handleConfigChange({ badge_color: e.target.value })}
                placeholder="#6366f1"
                className="flex-1"
              />
            </div>
            
            {/* Presets de couleurs */}
            <div className="grid grid-cols-4 gap-1">
              {colorPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  style={{ backgroundColor: preset.value, color: 'white', borderColor: preset.value }}
                  onClick={() => handleConfigChange({ badge_color: preset.value })}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Couleur de fond */}
          <div className="space-y-3">
            <Label htmlFor="badge-bg-color">Couleur de fond</Label>
            <div className="flex gap-2">
              <Input
                id="badge-bg-color"
                type="color"
                value={config.badge_background_color}
                onChange={(e) => handleConfigChange({ badge_background_color: e.target.value })}
                className="w-12 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                value={config.badge_background_color}
                onChange={(e) => handleConfigChange({ badge_background_color: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
            
            {/* Presets de couleurs de fond */}
            <div className="grid grid-cols-5 gap-1">
              {['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da'].map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  style={{ backgroundColor: color, borderColor: '#d1d5db' }}
                  onClick={() => handleConfigChange({ badge_background_color: color })}
                >
                  {color === '#ffffff' ? 'Blanc' : ''}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Informations sur les effets */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Effets visuels inclus :</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>• Effets d'animation lors de l'obtention</li>
            <li>• Particules de célébration</li>
            <li>• Halo lumineux au survol</li>
            <li>• Badge grisé pour les non-obtenus</li>
            <li>• Numéro de niveau affiché</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeConfiguration;