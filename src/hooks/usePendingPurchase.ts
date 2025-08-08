import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface PendingPurchase {
  id: string;
  name: string;
  price_euros: number;
  level_number: number;
}

export const usePendingPurchase = () => {
  const { user } = useAuth();
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);

  useEffect(() => {
    // Vérifier s'il y a un achat en attente après connexion
    if (user) {
      const stored = localStorage.getItem('pendingPurchase');
      if (stored) {
        try {
          const purchase = JSON.parse(stored);
          setPendingPurchase(purchase);
          // Ne pas supprimer immédiatement pour permettre à l'utilisateur de voir la modal
        } catch (error) {
          console.error('Erreur lors de la lecture de l\'achat en attente:', error);
          localStorage.removeItem('pendingPurchase');
        }
      }
    }
  }, [user]);

  const clearPendingPurchase = () => {
    localStorage.removeItem('pendingPurchase');
    setPendingPurchase(null);
  };

  return {
    pendingPurchase,
    clearPendingPurchase
  };
};