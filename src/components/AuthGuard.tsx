import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const AuthGuard = ({ children, requireAuth = true, fallback }: AuthGuardProps) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      navigate('/auth');
    }
  }, [user, loading, requireAuth, navigate]);

  // Affichage du chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Vérification de l'authentification</p>
        </div>
      </div>
    );
  }

  // Vérification de l'authentification
  if (requireAuth && !user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle>Erreur d'authentification</CardTitle>
            <CardDescription>
              Votre session a expiré ou n'est pas valide
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Veuillez vous reconnecter pour continuer
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/auth')} 
                className="flex-1"
              >
                Se connecter
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="flex-1"
              >
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérification de la session
  if (requireAuth && user && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle>Session expirée</CardTitle>
            <CardDescription>
              Votre session a expiré
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Veuillez vous reconnecter pour continuer
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/auth')} 
                className="flex-1"
              >
                Se reconnecter
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="flex-1"
              >
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};