import { useState } from 'react';
import { useLevelPricing } from '@/hooks/useLevelPricing';
import { useUserPurchases } from '@/hooks/useUserPurchases';
import { useLevelAccess } from '@/hooks/useLevelAccess';
import { useAuth } from '@/hooks/useAuth';
import { PricingCard } from '@/components/PricingCard';
import { PurchaseModal } from '@/components/PurchaseModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pricing, loading: pricingLoading } = useLevelPricing();
  const { hasValidPurchase, refetch: refetchPurchases } = useUserPurchases();
  const { levelAccess } = useLevelAccess();
  const { toast } = useToast();
  
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const getCurrentLevel = () => {
    const unlockedLevels = levelAccess.filter(l => l.isUnlocked);
    return unlockedLevels.length > 0 ? Math.max(...unlockedLevels.map(l => l.level)) : 1;
  };

  const handlePurchase = async (level: number) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour effectuer un achat.",
        variant: "destructive"
      });
      return;
    }

    setSelectedLevel(level);
  };

  const confirmPurchase = async (level: number) => {
    try {
      setPurchasing(true);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { level }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        
        // Attendre un peu puis rafraîchir les achats
        setTimeout(() => {
          refetchPurchases();
        }, 3000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création du paiement.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (pricingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Chargement des tarifs...</div>
        </div>
      </div>
    );
  }

  const currentLevel = getCurrentLevel();
  const selectedPricing = pricing.find(p => p.level === selectedLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-4">
            Tarifs & Abonnements
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choisissez le niveau qui vous convient et progressez à votre rythme dans votre apprentissage.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {pricing.map((price) => (
            <PricingCard
              key={price.level}
              level={price.level}
              price={price.price_euros}
              freeSessions={price.free_sessions}
              isPurchased={hasValidPurchase(price.level)}
              isCurrentLevel={price.level === currentLevel}
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <div className="bg-card p-8 rounded-2xl border max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Comment ça fonctionne ?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-primary font-semibold">1. Essayez gratuitement</div>
                 <p className="text-sm text-muted-foreground">
                   Démarrez avec quelques sessions gratuites par niveau
                 </p>
              </div>
              <div className="space-y-2">
                <div className="text-primary font-semibold">2. Débloquez l'accès complet</div>
                <p className="text-sm text-muted-foreground">
                  Achetez l'accès pour continuer votre progression sur le niveau
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-primary font-semibold">3. Obtenez votre certification</div>
                <p className="text-sm text-muted-foreground">
                  Complétez tous les niveaux pour obtenir votre certification officielle
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Modal */}
        {selectedPricing && (
          <PurchaseModal
            open={selectedLevel !== null}
            onOpenChange={(open) => !open && setSelectedLevel(null)}
            level={selectedLevel!}
            price={selectedPricing.price_euros}
            onConfirm={confirmPurchase}
          />
        )}
      </div>
    </div>
  );
}