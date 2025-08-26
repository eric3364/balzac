import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSessionProgress } from '@/hooks/useSessionProgress';
import { useLevelAccess } from '@/hooks/useLevelAccess';
import { SessionProgressComponent } from '@/components/SessionProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SessionProgress = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const level = parseInt(searchParams.get('level') || '1');
  const { levelAccess } = useLevelAccess();
  const { progress, loading: progressLoading, availableSessions } = useSessionProgress(level);

  // Vérifier si l'utilisateur a accès à ce niveau
  const currentLevelAccess = levelAccess.find(l => l.level === level);
  const hasLevelAccess = currentLevelAccess?.isUnlocked || level === 1;

  // Redirection si pas d'utilisateur ou pas d'accès au niveau
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    // Vérifier l'accès au niveau
    if (!hasLevelAccess && levelAccess.length > 0) {
      toast({
        title: "Accès refusé",
        description: `Vous devez d'abord valider le niveau ${level - 1} pour accéder au niveau ${level}.`,
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }
  }, [user, loading, navigate, hasLevelAccess, levelAccess, level]);

  const handleStartSession = (sessionNumber: number, sessionType: 'regular' | 'remedial') => {
    const session = availableSessions.find(s => s.sessionNumber === sessionNumber);
    
    if (!session?.isAvailable) {
      toast({
        title: "Session non disponible",
        description: "Vous devez d'abord valider la session précédente.",
        variant: "destructive"
      });
      return;
    }
    
    const sessionParams = new URLSearchParams({
      level: level.toString(),
      session: sessionNumber.toString(),
      type: sessionType
    });
    
    navigate(`/session-test?${sessionParams.toString()}`);
  };

  if (loading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Progression du niveau {level}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Impossible de charger la progression pour ce niveau.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Progression - Niveau {level}
            </h1>
            <p className="text-sm text-muted-foreground">
              Système de formation par sessions progressives
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <SessionProgressComponent
          progress={progress}
          availableSessions={availableSessions}
          onStartSession={handleStartSession}
          loading={progressLoading}
        />

        {/* Information sur le système */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Comment fonctionne le système de sessions ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">📚 Sessions progressives</h4>
                <p className="text-sm text-muted-foreground">
                  Chaque niveau est divisé en plusieurs sessions courtes. Vous devez réussir une session 
                  avec 75% minimum pour passer à la suivante.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🔄 Session de rattrapage</h4>
                <p className="text-sm text-muted-foreground">
                  À la fin de toutes les sessions, si vous avez des questions échouées, 
                  une session de rattrapage sera proposée.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🏆 Validation du niveau</h4>
                <p className="text-sm text-muted-foreground">
                  Le niveau est validé quand toutes les sessions sont réussies et 
                  la session de rattrapage complétée à 75% minimum.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">📊 Suivi personnalisé</h4>
                <p className="text-sm text-muted-foreground">
                  Vos erreurs sont suivies pour vous proposer un apprentissage adapté 
                  et une révision ciblée.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionProgress;