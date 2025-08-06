import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  price: number;
  onConfirm: (level: number) => Promise<void>;
}

export const PurchaseModal = ({
  open,
  onOpenChange,
  level,
  price,
  onConfirm
}: PurchaseModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    try {
      setLoading(true);
      await onConfirm(level);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Débloquer le Niveau {level}
          </DialogTitle>
          <DialogDescription className="text-center">
            Accédez à toutes les sessions du niveau {level}
          </DialogDescription>
        </DialogHeader>

        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-primary">
                {price}€
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

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handlePurchase}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Traitement...' : 'Payer maintenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};