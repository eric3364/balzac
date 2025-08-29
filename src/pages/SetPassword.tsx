import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

const SetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkIfFirstLogin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Vérifier si l'utilisateur a déjà défini son mot de passe
        // En vérifiant s'il a des données dans la table users avec is_active = true
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_active, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erreur lors de la vérification:', error);
          navigate('/dashboard');
          return;
        }

        // Si l'utilisateur est déjà actif, rediriger vers le dashboard
        if (userData?.is_active) {
          navigate('/dashboard');
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Erreur:', error);
        navigate('/dashboard');
      }
    };

    checkIfFirstLogin();
  }, [user, navigate]);

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    try {
      // Mettre à jour le mot de passe dans Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Marquer l'utilisateur comme actif dans la table users
      const { error: userError } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('user_id', user!.id);

      if (userError) {
        console.error('Erreur lors de la mise à jour du statut utilisateur:', userError);
      }

      toast({
        title: 'Mot de passe défini',
        description: 'Votre mot de passe a été défini avec succès. Bienvenue !',
      });

      // Rediriger vers le dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erreur lors de la définition du mot de passe:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Première connexion</h1>
          <p className="text-muted-foreground mt-2">
            Définissez votre mot de passe pour sécuriser votre compte
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Définir votre mot de passe</CardTitle>
            <CardDescription>
              Choisissez un mot de passe sécurisé pour votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 6 caractères
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Définition...' : 'Définir le mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetPassword;