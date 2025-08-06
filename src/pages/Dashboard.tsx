import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLevelAccess } from '@/hooks/useLevelAccess';
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Lock } from 'lucide-react';
import CertificationBadges from '@/components/CertificationBadges';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const userStats = useUserStats();
  const { isAdmin } = useIsAdmin();
  const { levelAccess, loading: levelAccessLoading } = useLevelAccess();
  const { difficultyLevels, loading: levelsLoading } = useDifficultyLevels();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Balzac Certification</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Balzac Certification</h1>
            <p className="text-sm text-muted-foreground">Plateforme d'apprentissage du français</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Bonjour, {user.user_metadata?.first_name || user.email}
            </span>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} title="Administration">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Section des badges de certification */}
        <CertificationBadges />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tests passés</CardTitle>
              <CardDescription>
                Nombre total de tests effectués
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : userStats.totalTests}
              </p>
              <p className="text-sm text-muted-foreground">
                Tests complétés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions répondues</CardTitle>
              <CardDescription>
                Total des questions traitées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : userStats.totalQuestions}
              </p>
              <p className="text-sm text-muted-foreground">
                Questions au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progression</CardTitle>
              <CardDescription>
                Votre taux de réussite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : `${userStats.progressPercentage}%`}
              </p>
              <p className="text-sm text-muted-foreground">
                De bonnes réponses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réponses correctes</CardTitle>
              <CardDescription>
                Questions réussies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {userStats.loading ? '...' : userStats.correctAnswers}
              </p>
              <p className="text-sm text-muted-foreground">
                Bonnes réponses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réponses incorrectes</CardTitle>
              <CardDescription>
                Questions à retravailler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {userStats.loading ? '...' : userStats.incorrectAnswers}
              </p>
              <p className="text-sm text-muted-foreground">
                Erreurs commises
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Temps d'étude</CardTitle>
              <CardDescription>
                Durée sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : 
                  userStats.timeSpent >= 60 ? 
                    `${Math.floor(userStats.timeSpent / 60)}h ${userStats.timeSpent % 60}min` :
                    `${userStats.timeSpent}min`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Temps total passé
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
              <CardDescription>
                Vos badges obtenus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : userStats.certificationsCount}
              </p>
              <p className="text-sm text-muted-foreground">Certifications obtenues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Niveau actuel</CardTitle>
              <CardDescription>
                Votre niveau d'étude
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {userStats.loading ? '...' : 
                  userStats.currentLevel === 1 ? 'Élémentaire' :
                  userStats.currentLevel === 2 ? 'Intermédiaire' :
                  userStats.currentLevel === 3 ? 'Avancé' :
                  userStats.currentLevel === 4 ? 'Expert' :
                  userStats.currentLevel === 5 ? 'Maître' : 'Élémentaire'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Niveau {userStats.loading ? '1' : userStats.currentLevel}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Sessions de formation</CardTitle>
              <CardDescription>
                Choisissez un niveau pour commencer votre formation par sessions progressives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {levelsLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className="h-20 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {difficultyLevels.map((difficultyLevel) => {
                    const level = difficultyLevel.level_number;
                    const levelInfo = levelAccess.find(l => l.level === level);
                    const isUnlocked = levelInfo?.isUnlocked || level === 1;
                    const isCompleted = levelInfo?.isCompleted || false;
                    
                    return (
                      <Button
                        key={level}
                        variant={isCompleted ? "default" : isUnlocked ? "outline" : "secondary"}
                        className={`h-20 flex flex-col items-center justify-center relative ${
                          !isUnlocked ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (isUnlocked) {
                            navigate(`/session-progress?level=${level}`);
                          }
                        }}
                        disabled={!isUnlocked}
                        title={!isUnlocked ? `Vous devez d'abord valider le niveau ${level - 1}` : ''}
                      >
                        {!isUnlocked && (
                          <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-lg font-semibold">Niveau {level}</span>
                        <span className="text-sm text-muted-foreground">
                          {difficultyLevel.name}
                        </span>
                        {isCompleted && (
                          <span className="text-xs text-green-600 font-medium">✓ Validé</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {!levelsLoading && difficultyLevels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun niveau de difficulté configuré.</p>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      className="mt-2" 
                      onClick={() => navigate('/admin')}
                    >
                      Configurer les niveaux
                    </Button>
                  )}
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  variant="default" 
                  className="w-full sm:w-auto" 
                  onClick={() => navigate('/test')}
                >
                  Mode test libre (ancien système)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;