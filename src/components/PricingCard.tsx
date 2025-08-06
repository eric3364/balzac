import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock } from 'lucide-react';

interface PricingCardProps {
  level: number;
  price: number;
  freeSessions: number;
  isPurchased: boolean;
  isCurrentLevel?: boolean;
  onPurchase: (level: number) => void;
}

export const PricingCard = ({
  level,
  price,
  freeSessions,
  isPurchased,
  isCurrentLevel = false,
  onPurchase
}: PricingCardProps) => {
  const isFree = price === 0;
  
  return (
    <Card className={`relative ${isCurrentLevel ? 'ring-2 ring-primary' : ''} ${isPurchased ? 'bg-accent/20' : ''}`}>
      {isCurrentLevel && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2" variant="default">
          Niveau actuel
        </Badge>
      )}
      
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Niveau {level}</CardTitle>
        <CardDescription>
          {isFree ? (
            <span className="text-green-600 font-semibold">Gratuit</span>
          ) : (
            <span className="text-3xl font-bold">{price}€</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {isFree ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Accès complet gratuit</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>{freeSessions} sessions gratuites</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Puis accès complet pour {price}€</span>
              </div>
            </>
          )}
        </div>
        
        {isPurchased ? (
          <Button disabled className="w-full">
            <Check className="h-4 w-4 mr-2" />
            Déjà acheté
          </Button>
        ) : isFree ? (
          <Button disabled className="w-full" variant="outline">
            Gratuit
          </Button>
        ) : (
          <Button 
            onClick={() => onPurchase(level)} 
            className="w-full"
          >
            Acheter maintenant
          </Button>
        )}
      </CardContent>
    </Card>
  );
};