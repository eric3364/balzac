import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';

interface AntiCheatOptions {
  onTestTerminated: () => void;
  maxAttempts?: number;
  isActive?: boolean;
  strictMode?: boolean; // Mode strict qui bloque complètement la fenêtre
}

export const useAntiCheat = ({ 
  onTestTerminated, 
  maxAttempts = 3, 
  isActive = true,
  strictMode = true 
}: AntiCheatOptions) => {
  const [attempts, setAttempts] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const hasShownWarning = useRef(false);
  const lockMessageShown = useRef(false);

  const handleSuspiciousActivity = (type: 'tab_switch' | 'window_blur' | 'page_unload' | 'navigation') => {
    if (!isActive || isTerminated) return;

    if (strictMode) {
      // En mode strict, toute tentative est immédiatement bloquée
      if (!lockMessageShown.current) {
        lockMessageShown.current = true;
        toast({
          title: "🔒 Session verrouillée",
          description: "Vous ne pouvez pas quitter cette page pendant le test. Terminez votre session pour continuer.",
          variant: "destructive",
          duration: 6000
        });
        setTimeout(() => {
          lockMessageShown.current = false;
        }, 2000);
      }
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const activityMessages = {
      tab_switch: "Vous avez changé d'onglet",
      window_blur: "Vous avez quitté la fenêtre",
      page_unload: "Vous tentez de fermer la page",
      navigation: "Vous tentez de naviguer"
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

    setIsLocked(true);

    // Message d'information sur le verrouillage
    if (strictMode && !lockMessageShown.current) {
      lockMessageShown.current = true;
      toast({
        title: "🔒 Session sécurisée",
        description: "Cette session est maintenant verrouillée. Vous ne pourrez pas quitter cette page jusqu'à la fin du test.",
        duration: 5000
      });
    }

    // Bloquer complètement la fermeture de l'onglet
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isTerminated) {
        e.preventDefault();
        e.returnValue = 'Cette session est verrouillée. Vous ne pouvez pas quitter pendant le test.';
        if (strictMode) {
          handleSuspiciousActivity('page_unload');
        }
        return e.returnValue;
      }
    };

    // Détecter et bloquer le changement d'onglet
    const handleVisibilityChange = () => {
      if (document.hidden && !hasShownWarning.current) {
        hasShownWarning.current = true;
        setTimeout(() => {
          hasShownWarning.current = false;
        }, 1000);
        handleSuspiciousActivity('tab_switch');
      }
    };

    // Détecter la perte de focus
    const handleWindowBlur = () => {
      if (!hasShownWarning.current) {
        hasShownWarning.current = true;
        setTimeout(() => {
          hasShownWarning.current = false;
        }, 1000);
        handleSuspiciousActivity('window_blur');
      }
    };

    // Bloquer la navigation avec le navigateur
    const handlePopState = (e: PopStateEvent) => {
      if (strictMode) {
        e.preventDefault();
        // Repousser l'état actuel pour empêcher la navigation
        window.history.pushState(null, '', window.location.href);
        handleSuspiciousActivity('navigation');
      }
    };

    // Pousser un état dans l'historique pour bloquer le bouton retour
    if (strictMode) {
      window.history.pushState(null, '', window.location.href);
    }

    // Désactiver le clic droit et les raccourcis dangereux
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: "Action bloquée",
        description: "Le clic droit est désactivé pendant le test.",
        variant: "destructive"
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Vérifier si c'est une saisie dans un champ input ou textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      // Si c'est une saisie dans un champ, ne bloquer que les raccourcis vraiment dangereux
      if (isInputField) {
        // Permettre toutes les touches de saisie normale dans les champs
        const isDangerousShortcut = (
          (e.ctrlKey && ['U', 'R', 'W', 'T', 'N'].includes(e.key)) ||
          (e.ctrlKey && e.shiftKey && ['I', 'C', 'J', 'N'].includes(e.key)) ||
          (e.altKey && ['F4', 'Tab'].includes(e.key)) ||
          (e.key === 'F12' && !e.ctrlKey && !e.shiftKey && !e.altKey)
        );
        
        if (!isDangerousShortcut) {
          return; // Permettre la saisie normale
        }
      }

      // Bloquer les raccourcis de navigation et d'outils de développement
      const blockedCombinations = [
        { ctrl: true, shift: true, key: 'I' }, // DevTools
        { ctrl: true, shift: true, key: 'C' }, // Console
        { ctrl: true, shift: true, key: 'J' }, // Console
        { ctrl: true, key: 'U' }, // Voir source
        { ctrl: true, key: 'R' }, // Rafraîchir
        { ctrl: true, key: 'F5' }, // Rafraîchir
        { ctrl: true, key: 'W' }, // Fermer onglet
        { ctrl: true, key: 'T' }, // Nouvel onglet
        { ctrl: true, key: 'N' }, // Nouvelle fenêtre
        { ctrl: true, shift: true, key: 'N' }, // Fenêtre privée
        { alt: true, key: 'F4' }, // Fermer fenêtre
        { alt: true, key: 'Tab' }, // Changer d'application
        { ctrl: true, key: 'Tab' }, // Changer d'onglet
        { ctrl: true, shift: true, key: 'Tab' }, // Changer d'onglet (reverse)
      ];

      // Bloquer F12 et F5 sans modificateurs
      if (['F12', 'F5'].includes(e.key) && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          title: "Action bloquée",
          description: "Cette touche est désactivée pendant le test.",
          variant: "destructive"
        });
        return;
      }

      // Vérifier les combinaisons bloquées
      for (const combo of blockedCombinations) {
        if (
          (combo.ctrl === undefined || combo.ctrl === e.ctrlKey) &&
          (combo.shift === undefined || combo.shift === e.shiftKey) &&
          (combo.alt === undefined || combo.alt === e.altKey) &&
          combo.key === e.key
        ) {
          e.preventDefault();
          e.stopPropagation();
          toast({
            title: "Action bloquée",
            description: "Cette combinaison de touches est désactivée pendant le test.",
            variant: "destructive"
          });
          return;
        }
      }
    };

    // Bloquer le glisser-déposer qui pourrait permettre d'ouvrir de nouveaux onglets
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      toast({
        title: "Action bloquée",
        description: "Le glisser-déposer est désactivé pendant le test.",
        variant: "destructive"
      });
    };

    // Ajouter tous les événements
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    // Essayer de passer en plein écran une seule fois au début
    let fullscreenAttempted = false;
    if (strictMode && !fullscreenAttempted && document.documentElement.requestFullscreen) {
      fullscreenAttempted = true;
      document.documentElement.requestFullscreen().catch(() => {
        // Ignore l'erreur si le plein écran n'est pas autorisé
      });
    }

    return () => {
      setIsLocked(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      
      // Sortir du plein écran
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Ignore l'erreur
        });
      }
    };
  }, [isActive, attempts, isTerminated, maxAttempts, onTestTerminated, strictMode]);

  return {
    attempts,
    isTerminated,
    isLocked,
    remainingAttempts: maxAttempts - attempts
  };
};