import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook qui vérifie si l'utilisateur a un code promo dans ses métadonnées
 * et l'applique automatiquement après la première connexion
 */
export const useApplySignupPromoCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasApplied = useRef(false);

  useEffect(() => {
    const applyPromoCodeFromSignup = async () => {
      if (!user || hasApplied.current) return;

      const promoCode = user.user_metadata?.promo_code;
      
      if (!promoCode) return;

      // Vérifier si le code promo a déjà été appliqué (dans les métadonnées)
      if (user.user_metadata?.promo_code_applied) return;

      hasApplied.current = true;
      console.log('Tentative d\'application du code promo:', promoCode);

      try {
        // Récupérer les niveaux disponibles pour les codes promo
        const { data: promoCodes, error: promoError } = await supabase
          .from('promo_codes')
          .select('level, discount_percentage')
          .eq('code', promoCode.toUpperCase())
          .eq('is_used', false);

        if (promoError || !promoCodes || promoCodes.length === 0) {
          console.log('Code promo invalide ou déjà utilisé');
          return;
        }

        // Appliquer le code promo pour chaque niveau disponible
        let appliedLevels: number[] = [];
        
        for (const promo of promoCodes) {
          const { data, error } = await supabase.rpc('apply_promo_code', {
            code_text: promoCode.toUpperCase(),
            user_uuid: user.id,
            certification_level: promo.level
          });

          if (!error && (data as any)?.success) {
            appliedLevels.push(promo.level);
            console.log(`Code promo appliqué pour le niveau ${promo.level}`);
          }
        }

        if (appliedLevels.length > 0) {
          // Marquer le code promo comme appliqué dans les métadonnées
          await supabase.auth.updateUser({
            data: { promo_code_applied: true }
          });

          toast({
            title: "Code promo appliqué !",
            description: `Votre code promo a été appliqué pour le${appliedLevels.length > 1 ? 's' : ''} niveau${appliedLevels.length > 1 ? 'x' : ''} ${appliedLevels.join(', ')}`,
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'application automatique du code promo:', error);
      }
    };

    applyPromoCodeFromSignup();
  }, [user, toast]);
};
