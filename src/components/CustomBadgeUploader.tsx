import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomBadgeUploaderProps {
  currentBadgeUrl?: string;
  onBadgeChange: (url: string | null) => void;
  levelNumber: number;
  disabled?: boolean;
}

export const CustomBadgeUploader: React.FC<CustomBadgeUploaderProps> = ({
  currentBadgeUrl,
  onBadgeChange,
  levelNumber,
  disabled = false
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Type de fichier non supporté. Utilisez PNG, JPG, JPEG, WebP ou SVG.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'La taille du fichier ne doit pas dépasser 2MB.';
    }
    return null;
  };

  const uploadBadge = async (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      toast({
        title: "Erreur",
        description: validation,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Générer un nom de fichier unique basé sur le niveau et timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `level-${levelNumber}-badge-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Supprimer l'ancien badge s'il existe
      if (currentBadgeUrl) {
        const oldFileName = currentBadgeUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('custom-badges')
            .remove([oldFileName]);
        }
      }

      // Télécharger le nouveau badge
      const { error: uploadError } = await supabase.storage
        .from('custom-badges')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('custom-badges')
        .getPublicUrl(filePath);

      const newBadgeUrl = data.publicUrl;
      onBadgeChange(newBadgeUrl);

      toast({
        title: "Succès",
        description: "Badge personnalisé téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le badge.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeBadge = async () => {
    if (!currentBadgeUrl) return;

    try {
      const fileName = currentBadgeUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('custom-badges')
          .remove([fileName]);
      }

      onBadgeChange(null);
      toast({
        title: "Succès",
        description: "Badge personnalisé supprimé.",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le badge.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadBadge(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      uploadBadge(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      <Label>Badge personnalisé (optionnel)</Label>
      
      {/* Zone de téléchargement */}
      <Card
        className={`transition-colors cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-dashed'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            {currentBadgeUrl ? (
              <div className="space-y-3">
                <img
                  src={currentBadgeUrl}
                  alt="Badge personnalisé"
                  className="h-16 w-16 object-contain rounded"
                />
                <p className="text-sm text-muted-foreground">
                  Badge personnalisé actuel
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled && !uploading) fileInputRef.current?.click();
                    }}
                    disabled={disabled || uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Remplacer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBadge();
                    }}
                    disabled={disabled || uploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {uploading ? 'Téléchargement...' : 'Télécharger un badge personnalisé'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez ou cliquez pour sélectionner
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input file caché */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Informations sur les formats */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Formats supportés: PNG, JPG, JPEG, WebP, SVG. Taille max: 2MB.
          <br />
          Dimensions recommandées: 128x128px ou ratio 1:1.
        </AlertDescription>
      </Alert>
    </div>
  );
};