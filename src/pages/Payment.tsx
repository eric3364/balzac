import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLevelPricing } from '@/hooks/useLevelPricing';
import { usePromoCode } from '@/hooks/usePromoCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CreditCard, Shield, Zap, Gift, Check, User, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { pricing } = useLevelPricing();
  const { applyPromoCode, checkPromoCode, loading: promoLoading } = usePromoCode();

  const [level, setLevel] = useState<number | null>(null);
  const [certification, setCertification] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoValidated, setPromoValidated] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    const levelParam = searchParams.get('level');
    if (levelParam) {
      const levelNum = parseInt(levelParam);
      setLevel(levelNum);
      
      const cert = pricing.find(p => p.level === levelNum);
      if (cert) {
        setCertification(cert);
        setFinalPrice(cert.price_euros);
      }
    }
  }, [searchParams, pricing]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setAuthLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const school = formData.get('school') as string;
    const className = formData.get('className') as string;

    const { error } = await signUp(email, password, firstName, lastName, school, className);
    
    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive"
      });
      setAuthLoading(false);
    } else {
      toast({
        title: "Inscription réussie",
        description: "Bienvenue ! Redirection vers votre tableau de bord...",
      });
      // Rediriger vers le dashboard après une inscription réussie
      navigate('/dashboard');
    }
  };

  const handleCheckPromoCode = async () => {
    if (!level) return;
    
    const { valid, discount } = await checkPromoCode(promoCode, level);
    if (valid) {
      setPromoValidated(true);
      setPromoDiscount(discount);
      const newPrice = certification.price_euros * (1 - discount / 100);
      setFinalPrice(newPrice);
      toast({
        title: "Code promo validé !",
        description: `Réduction de ${discount}% appliquée. ${!user ? 'Connectez-vous pour finaliser.' : ''}`,
      });
    }
  };

  const handleApplyPromoCode = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour finaliser l'application du code promo.",
        variant: "destructive",
      });
      return;
    }

    if (!level) return;
    
    const success = await applyPromoCode(promoCode, level);
    if (success) {
      setPromoApplied(true);
      setFinalPrice(0);
      toast({
        title: "Code promo appliqué !",
        description: "Votre certification est maintenant gratuite.",
      });
    }
  };

  const handlePayment = async () => {
    if (!user || !level) return;

    try {
      setLoading(true);

      if (finalPrice === 0) {
        // Achat gratuit avec code promo - déjà traité
        toast({
          title: "Achat confirmé",
          description: "Votre accès a été activé ! Vous recevrez votre code d'accès par email.",
        });
        navigate('/dashboard');
        return;
      }

      // Paiement via Stripe
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          level,
          payment_method: paymentMethod 
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url; // Redirection vers Stripe
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du paiement.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!certification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Balzac Certification</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Récapitulatif de commande */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Récapitulatif de commande
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{certification.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Niveau {certification.level}
                    </p>
                  </div>
                  <div className="text-right">
                    {promoValidated || promoApplied ? (
                      <div className="space-y-1">
                        <p className="text-sm line-through text-muted-foreground">
                          {certification.price_euros}€
                        </p>
                        <Badge variant="secondary" className="text-green-600">
                          {promoApplied ? 'Gratuit' : `${finalPrice}€`}
                        </Badge>
                      </div>
                    ) : (
                      <p className="font-semibold">{certification.price_euros}€</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Accès immédiat après paiement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Code d'accès envoyé par email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Paiement sécurisé</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {promoApplied ? '0€' : `${finalPrice || certification.price_euros}€`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Code promo */}
            {!promoApplied && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="h-4 w-4 text-green-600" />
                    Code promo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Entrez votre code promo"
                      disabled={promoLoading}
                    />
                    <Button
                      variant="outline"
                      onClick={promoValidated && !user ? handleApplyPromoCode : handleCheckPromoCode}
                      disabled={promoLoading || !promoCode.trim()}
                    >
                      {promoLoading ? "..." : 
                        (promoValidated && !user ? "Appliquer" : 
                         promoValidated ? "✓ Validé" : "Vérifier")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {promoValidated && !user ? 
                      "Connectez-vous pour appliquer définitivement le code promo." :
                      "Certains codes promo permettent d'obtenir la certification gratuitement."}
                  </p>
                </CardContent>
              </Card>
            )}

            {promoApplied && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Code promo appliqué</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Votre certification est maintenant gratuite !
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Section Connexion/Inscription si non connecté */}
          {!user && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Connexion requise pour finaliser l'achat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="signup" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="signin" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Connexion
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Inscription
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="mt-6">
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email">Email</Label>
                          <Input
                            id="signin-email"
                            name="email"
                            type="email"
                            placeholder="votre@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signin-password">Mot de passe</Label>
                          <Input
                            id="signin-password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={authLoading}>
                          {authLoading ? 'Connexion...' : 'Se connecter'}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="mt-6">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">Prénom</Label>
                            <Input
                              id="firstName"
                              name="firstName"
                              placeholder="Jean"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Nom</Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              placeholder="Dupont"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            name="email"
                            type="email"
                            placeholder="votre@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Mot de passe</Label>
                          <Input
                            id="signup-password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            minLength={6}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school">École</Label>
                          <Input
                            id="school"
                            name="school"
                            placeholder="ESCEN"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="className">Classe</Label>
                          <Input
                            id="className"
                            name="className"
                            placeholder="N1"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={authLoading}>
                          {authLoading ? 'Inscription...' : "S'inscrire et payer"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Informations de paiement - Affiché seulement si connecté */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {finalPrice > 0 ? "Informations de paiement" : "Finaliser l'achat"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {finalPrice > 0 ? (
                  <>
                    {/* Mode de paiement */}
                    <div className="space-y-3">
                      <Label>Mode de paiement</Label>
                      <div className="grid gap-3">
                        <div 
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            paymentMethod === 'card' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setPaymentMethod('card')}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              paymentMethod === 'card' 
                                ? 'border-primary bg-primary' 
                                : 'border-border'
                            }`} />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span className="font-medium">Carte bancaire</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 ml-7">
                            Visa, Mastercard, American Express
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Paiement sécurisé
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Vos informations de paiement sont sécurisées par Stripe. 
                            Nous ne stockons jamais vos données bancaires.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Gift className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">
                        Certification gratuite !
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Votre code promo vous donne accès gratuit à cette certification.
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  {loading ? (
                    "Traitement..."
                  ) : finalPrice > 0 ? (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Payer {finalPrice}€
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirmer l'achat gratuit
                    </>
                  )}
                </Button>

                {finalPrice > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    En cliquant sur "Payer", vous serez redirigé vers notre 
                    plateforme de paiement sécurisée Stripe.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}