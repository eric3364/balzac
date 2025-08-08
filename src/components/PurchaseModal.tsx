import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Shield, Zap, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePromoCode } from '@/hooks/usePromoCode';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certification: {
    id: string;
    name: string;
    price_euros: number;
    level_number: number;
  };
  onConfirm: (level: number) => Promise<void>;
}

export const PurchaseModal = ({
  open,
  onOpenChange,
  certification,
  onConfirm
}: PurchaseModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const { toast } = useToast();
  const { applyPromoCode, loading: promoLoading } = usePromoCode();

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour effectuer un achat.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await onConfirm(certification.level_number);
      onOpenChange(false);
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
    const success = await applyPromoCode(promoCode, certification.level_number);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {certification.name}
          </DialogTitle>
          <DialogDescription>
            Niveau {certification.level_number} - Certification officielle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                    <span>Accès immédiat</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Via Stripe</span>
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
                disabled={promoLoading}
              />
              <Button
                variant="outline"
                onClick={handleApplyPromoCode}
                disabled={promoLoading || !promoCode.trim()}
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
                Badge LinkedIn officiel
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Certificat téléchargeable
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Support client dédié
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading || promoLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={handlePurchase} 
            disabled={loading || promoLoading}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {loading ? "Traitement..." : `Payer ${certification.price_euros}€`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};