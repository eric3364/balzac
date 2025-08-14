import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const usePromoCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Vérifier la validité d'un code promo sans connexion
  const checkPromoCode = async (code: string, level: number): Promise<{ valid: boolean; discount: number }> => {
    if (!code.trim()) {
      toast({
        title: "Code promo requis",
        description: "Veuillez entrer un code promo.",
        variant: "destructive",
      });
      return { valid: false, discount: 0 };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('discount_percentage, is_used, expires_at')
        .eq('code', code.trim().toUpperCase())
        .eq('level', level)
        .single();

      if (error || !data) {
        toast({
          title: "Code promo invalide",
          description: "Ce code promo n'existe pas ou n'est pas valide pour ce niveau.",
          variant: "destructive",
        });
        return { valid: false, discount: 0 };
      }

      if (data.is_used) {
        toast({
          title: "Code promo déjà utilisé",
          description: "Ce code promo a déjà été utilisé.",
          variant: "destructive",
        });
        return { valid: false, discount: 0 };
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({
          title: "Code promo expiré",
          description: "Ce code promo a expiré.",
          variant: "destructive",
        });
        return { valid: false, discount: 0 };
      }

      return { valid: true, discount: data.discount_percentage };
    } catch (error) {
      console.error('Erreur lors de la vérification du code promo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le code promo. Veuillez réessayer.",
        variant: "destructive",
      });
      return { valid: false, discount: 0 };
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = async (code: string, level: number): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour utiliser un code promo.",
        variant: "destructive",
      });
      return false;
    }

    if (!code.trim()) {
      toast({
        title: "Code promo requis",
        description: "Veuillez entrer un code promo.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('apply_promo_code', {
        code_text: code.trim(),
        user_uuid: user.id,
        certification_level: level
      });

      if (error) throw error;

      if ((data as any).success) {
        toast({
          title: "Code promo appliqué !",
          description: (data as any).message,
        });
        return true;
      } else {
        toast({
          title: "Code promo invalide",
          description: (data as any).error,
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de l\'application du code promo:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer le code promo. Veuillez réessayer.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    applyPromoCode,
    checkPromoCode,
    loading
  };
};