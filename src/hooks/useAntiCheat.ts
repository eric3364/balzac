import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';

interface AntiCheatOptions {
  onTestTerminated: () => void;
  maxAttempts?: number;
  isActive?: boolean;
}

export const useAntiCheat = ({ 
  onTestTerminated, 
  maxAttempts = 3, 
  isActive = true 
}: AntiCheatOptions) => {
  const [attempts, setAttempts] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const hasShownWarning = useRef(false);

  const handleSuspiciousActivity = (type: 'tab_switch' | 'window_blur' | 'page_unload') => {
    if (!isActive || isTerminated) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const activityMessages = {
      tab_switch: "Vous avez changé d'onglet",
      window_blur: "Vous avez quitté la fenêtre",
      page_unload: "Vous tentez de fermer la page"
    };

    if (newAttempts >= maxAttempts) {
      setIsTerminated(true);
      toast({
        title: "Test interrompu",
        description: "Vous avez dépassé le nombre d'avertissements autorisés. Le test est terminé.",
        variant: "destructive",
        duration: 5000
      });
      onTestTerminated();
    } else {
      const remainingAttempts = maxAttempts - newAttempts;
      toast({
        title: "⚠️ Avertissement",
        description: `${activityMessages[type]}. Il vous reste ${remainingAttempts} avertissement(s) avant l'interruption du test.`,
        variant: "destructive",
        duration: 4000
      });
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // Prévenir la fermeture de l'onglet
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isTerminated) {
        e.preventDefault();
        e.returnValue = 'Êtes-vous sûr de vouloir quitter le test ? Vos progrès seront perdus.';
        handleSuspiciousActivity('page_unload');
        return e.returnValue;
      }
    };

    // Détecter le changement d'onglet
    const handleVisibilityChange = () => {
      if (document.hidden && !hasShownWarning.current) {
        hasShownWarning.current = true;
        setTimeout(() => {
          hasShownWarning.current = false;
        }, 1000);
        handleSuspiciousActivity('tab_switch');
      }
    };

    // Détecter la perte de focus de la fenêtre
    const handleWindowBlur = () => {
      if (!hasShownWarning.current) {
        hasShownWarning.current = true;
        setTimeout(() => {
          hasShownWarning.current = false;
        }, 1000);
        handleSuspiciousActivity('window_blur');
      }
    };

    // Ajouter les événements
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Désactiver le clic droit et certains raccourcis clavier
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: "Action non autorisée",
        description: "Le clic droit est désactivé pendant le test.",
        variant: "destructive"
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquer F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        toast({
          title: "Action non autorisée",
          description: "Cette combinaison de touches est désactivée pendant le test.",
          variant: "destructive"
        });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, attempts, isTerminated, maxAttempts, onTestTerminated]);

  return {
    attempts,
    isTerminated,
    remainingAttempts: maxAttempts - attempts
  };
};