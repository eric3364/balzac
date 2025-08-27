import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

export const useSupabaseQuery = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const executeQuery = useCallback(async <T>(
    queryFunction: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    try {
      // Vérifier d'abord si on a une session valide
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        });
        navigate('/auth');
        return { data: null, error: { message: 'Session expired' } };
      }

      const result = await queryFunction();
      
      // Gérer les erreurs d'authentification
      if (result.error) {
        const errorMessage = result.error.message?.toLowerCase() || '';
        const errorCode = result.error.code;
        
        // Codes d'erreur liés à l'authentification
        if (
          errorCode === 'session_not_found' || 
          errorCode === 'invalid_token' ||
          errorMessage.includes('session') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized')
        ) {
          console.error('Auth error detected:', result.error);
          toast({
            title: "Erreur d'authentification",
            description: "Votre session a expiré. Veuillez vous reconnecter.",
            variant: "destructive"
          });
          navigate('/auth');
          return { data: null, error: result.error };
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Query execution error:', error);
      
      // Vérifier si c'est une erreur liée à l'auth
      const errorMessage = error.message?.toLowerCase() || '';
      if (
        errorMessage.includes('session') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized')
      ) {
        toast({
          title: "Erreur d'authentification",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        });
        navigate('/auth');
      }
      
      return { data: null, error };
    }
  }, [session, navigate]);

  return { executeQuery };
};