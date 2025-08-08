import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Shield, Zap, Gift, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePromoCode } from '@/hooks/usePromoCode';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certification: {
    id: string;
    name: string;
    price_euros: number;
    level_number: number;
  };
}

export const CheckoutFlow = ({ open, onOpenChange, certification }: CheckoutFlowProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const { toast } = useToast();
  const { applyPromoCode, loading: promoLoading } = usePromoCode();

  const handleAuthRequired = () => {
    // Stocker les informations de certification pour après l'inscription
    localStorage.setItem('pendingPurchase', JSON.stringify(certification));
    toast({
      title: "Inscription requise",
      description: "Veuillez vous inscrire pour continuer votre achat.",
    });
    navigate('/auth');
    onOpenChange(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      handleAuthRequired();
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { level: certification.level_number }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Redirection vers le paiement",
          description: "Une nouvelle fenêtre s'est ouverte pour finaliser votre achat.",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du paiement.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!user) {
      handleAuthRequired();
      return;
    }
    
    const success = await applyPromoCode(promoCode, certification.level_number);
    if (success) {
      toast({
        title: "Achat gratuit confirmé",
        description: "Votre accès a été activé ! Vous recevrez votre code d'accès par email.",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Finaliser votre achat
          </DialogTitle>
          <DialogDescription>
            {certification.name} - Niveau {certification.level_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!user && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold text-orange-900">Inscription requise</h3>
                  <p className="text-sm text-orange-800">
                    Vous devez créer un compte pour finaliser votre achat
                  </p>
                  <Button 
                    onClick={handleAuthRequired}
                    className="w-full"
                    variant="outline"
                  >
                    S'inscrire maintenant
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Info */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-3xl font-bold text-primary">
                  {certification.price_euros}€
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Accès immédiat après paiement</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Code d'accès envoyé par email</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Paiement sécurisé via Stripe</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Promo Code Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              <Label htmlFor="promo-code" className="text-sm font-medium">
                Code promo (optionnel)
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                id="promo-code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Entrez votre code promo"
                disabled={promoLoading || !user}
              />
              <Button
                variant="outline"
                onClick={handleApplyPromoCode}
                disabled={promoLoading || !promoCode.trim() || !user}
                size="sm"
              >
                {promoLoading ? "..." : "Appliquer"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Certains codes promo permettent d'obtenir la certification gratuitement.
            </p>
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-2">
            <h4 className="font-medium">Inclus dans votre achat :</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Accès immédiat à la certification
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Code d'accès personnel envoyé par email
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Badge LinkedIn officiel
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Support client dédié
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading || promoLoading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={handlePurchase} 
            disabled={loading || promoLoading || !user}
            className="flex items-center gap-2 flex-1"
          >
            <CreditCard className="h-4 w-4" />
            {loading ? "Traitement..." : `Payer ${certification.price_euros}€`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};