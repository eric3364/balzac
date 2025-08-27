import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HomepageAssetUploaderProps {
  label: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  bucketPath: string;
  recommendedDimensions?: string;
}

export const HomepageAssetUploader = ({ label, currentUrl, onUrlChange, bucketPath, recommendedDimensions }: HomepageAssetUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${bucketPath}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('homepage-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('homepage-assets')
        .getPublicUrl(filePath);

      onUrlChange(data.publicUrl);
      
      toast({
        title: "Image uploadée",
        description: `${label} a été mis à jour avec succès`
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const url = new URL(currentUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts[pathParts.length - 1];

      if (filePath) {
        await supabase.storage
          .from('homepage-assets')
          .remove([filePath]);
      }

      onUrlChange('');
      
      toast({
        title: "Image supprimée",
        description: `${label} a été supprimé avec succès`
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'image",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        {recommendedDimensions && (
          <p className="text-sm text-muted-foreground mt-1">
            Dimensions recommandées : {recommendedDimensions}
          </p>
        )}
      </div>
      
      {currentUrl && (
        <div className="relative border border-border rounded-lg p-4">
          <img 
            src={currentUrl} 
            alt={label}
            className="max-w-full h-32 object-contain mx-auto rounded"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id={`upload-${bucketPath}`}
        />
        <Label 
          htmlFor={`upload-${bucketPath}`}
          className="cursor-pointer"
        >
          <Button 
            variant="outline" 
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-border border-t-primary rounded-full" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Upload...' : 'Choisir une image'}
            </span>
          </Button>
        </Label>
        
        {!currentUrl && (
          <div className="flex items-center text-muted-foreground text-sm">
            <Image className="h-4 w-4 mr-1" />
            Aucune image sélectionnée
          </div>
        )}
      </div>
    </div>
  );
};