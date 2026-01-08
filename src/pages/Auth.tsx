import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePendingPurchase } from '@/hooks/usePendingPurchase';
import { useReferenceValues } from '@/hooks/useReferenceValues';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle, Tag, KeyRound } from 'lucide-react';
import { BalzacWorksBackground } from '@/components/BalzacWorksBackground';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingPurchase } = usePendingPurchase();
  const { getAllSchools, getAllClasses, getAllCities } = useReferenceValues();
  
  // Valeurs de référence dynamiques
  const schools = getAllSchools();
  const classes = getAllClasses();
  const cities = getAllCities();

  // Déterminer si c'est un flow de récupération de mot de passe
  const isRecoveryMode = searchParams.get('type') === 'recovery';

  // Déterminer l'onglet par défaut (signup si on vient de "commencer maintenant")
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';

  // Redirect if already authenticated (sauf en mode recovery)
  // En mode recovery, on laisse l'utilisateur définir son nouveau mot de passe
  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate('/');
    }
    // Ne pas rediriger si on est en mode recovery, même si l'utilisateur est connecté
  }, [user, navigate, isRecoveryMode]);

  // Fonction pour mettre à jour le mot de passe après recovery
  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été modifié avec succès."
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du mot de passe.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('passwordConfirm') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    // Vérifier que les mots de passe correspondent
    if (password !== passwordConfirm) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      setIsLoading(false);
      return;
    }
    setPasswordError('');

    const { error } = await signUp(email, password, firstName, lastName, selectedSchool, selectedClass, selectedCity, promoCode.trim().toUpperCase() || undefined);
    
    if (!error) {
      setShowSignupSuccess(true);
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    await resetPassword(email);
    setIsLoading(false);
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <BalzacWorksBackground />
      <div className="w-full max-w-md relative z-10">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Balzac Certification</h1>
          <p className="text-muted-foreground mt-2">
            {isRecoveryMode 
              ? "Réinitialisation du mot de passe"
              : pendingPurchase 
                ? `Finalisez votre achat - ${pendingPurchase.name}`
                : "Plateforme d'apprentissage du français"
            }
          </p>
        </div>

        {/* Mode Recovery - Formulaire de nouveau mot de passe */}
        {isRecoveryMode ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Nouveau mot de passe
              </CardTitle>
              <CardDescription>
                Définissez votre nouveau mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Connexion</CardTitle>
                <CardDescription>
                  Connectez-vous à votre compte pour accéder à vos cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showForgotPassword ? (
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Mot de passe oublié ?
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        Entrez votre adresse email pour recevoir un lien de réinitialisation
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowForgotPassword(false)}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Retour à la connexion
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Inscription</CardTitle>
                <CardDescription>
                  Créez votre compte pour commencer votre parcours d'apprentissage
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    <Label htmlFor="signup-password-confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="signup-password-confirm"
                      name="passwordConfirm"
                      type="password"
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school">École</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool} required>
                      <SelectTrigger id="school">
                        <SelectValue placeholder="Sélectionnez votre école" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school} value={school}>
                            {school}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="className">Classe</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} required>
                      <SelectTrigger id="className">
                        <SelectValue placeholder="Sélectionnez votre classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity} required>
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Sélectionnez votre ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promoCode" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Code promo (optionnel)
                    </Label>
                    <Input
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Entrez votre code promo"
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si vous avez un code promo, il sera automatiquement appliqué à votre compte
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !selectedSchool || !selectedClass || !selectedCity}>
                    {isLoading ? 'Inscription...' : "S'inscrire"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}

        <Dialog open={showSignupSuccess} onOpenChange={setShowSignupSuccess}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">Inscription réussie !</DialogTitle>
              <DialogDescription className="text-center space-y-2">
                <p>Votre compte a été créé avec succès.</p>
                <p className="font-medium">
                  Pour finaliser votre inscription, veuillez vérifier votre boîte email et cliquer sur le lien de validation.
                </p>
                <p className="text-sm font-semibold text-destructive mt-2">
                  MERCI DE VÉRIFIER VOS SPAMS !
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowSignupSuccess(false)}>
                J'ai compris
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;