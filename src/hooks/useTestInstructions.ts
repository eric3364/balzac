import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTestInstructions = () => {
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchInstructions = async () => {
    try {
      const { data, error } = await supabase
        .from('site_configuration')
        .select('config_value')
        .eq('config_key', 'test_instructions_message')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching test instructions:', error);
        return;
      }

      if (data?.config_value) {
        // La valeur est stockée en JSON, donc il faut la parser
        const instructionText = typeof data.config_value === 'string' 
          ? JSON.parse(data.config_value) 
          : data.config_value;
        setInstructions(instructionText);
      } else {
        // Valeur par défaut si aucune configuration n'est trouvée
        setInstructions("Attention vos réponses doivent être écrites parfaitement en respectant la casse et la ponctuation éventuelle. Vous ne pouvez pas répondre réponse 1, 2 ou 3 ou bien A, B, C..!");
      }
    } catch (error) {
      console.error('Error loading test instructions:', error);
      setInstructions("Attention vos réponses doivent être écrites parfaitement en respectant la casse et la ponctuation éventuelle. Vous ne pouvez pas répondre réponse 1, 2 ou 3 ou bien A, B, C..!");
    } finally {
      setLoading(false);
    }
  };

  const updateInstructions = async (newInstructions: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('site_configuration')
        .upsert({
          config_key: 'test_instructions_message',
          config_value: JSON.stringify(newInstructions)
        }, {
          onConflict: 'config_key'
        });

      if (error) {
        console.error('Error updating test instructions:', error);
        return false;
      }

      setInstructions(newInstructions);
      return true;
    } catch (error) {
      console.error('Error updating test instructions:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  return {
    instructions,
    loading,
    updateInstructions,
    refetch: fetchInstructions
  };
};