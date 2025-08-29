import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/AuthGuard';
import { useUserStats } from '@/hooks/useUserStats';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLevelAccess } from '@/hooks/useLevelAccess';
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Lock, BookOpen, Target, Clock, TrendingUp, Award, BarChart3 } from 'lucide-react';
import CertificationBadges from '@/components/CertificationBadges';
import StatsCard from '@/components/dashboard/StatsCard';
import ProgressChart from '@/components/dashboard/ProgressChart';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import StudyTimeChart from '@/components/dashboard/StudyTimeChart';
import ActivityHeatmap from '@/components/dashboard/ActivityHeatmap';

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
    <AuthGuard>
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
            <Button variant="outline" onClick={async () => {
              console.log('Clique sur le bouton de déconnexion');
              await signOut();
              console.log('SignOut terminé, navigation vers /auth');
              navigate('/auth', { replace: true });
            }}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Section des badges de certification */}
        <div className="animate-fade-in">
          <CertificationBadges />
        </div>

        {/* Sessions de test */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card>
            <CardHeader>
              <CardTitle>Sessions de test</CardTitle>
              <CardDescription>
                Choisissez un niveau pour commencer vos tests par sessions progressives
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
              
            </CardContent>
          </Card>
        </div>
        
        {/* Cartes de statistiques principales */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tests passés"
            value={userStats.loading ? '...' : userStats.totalTests}
            subtitle="Sessions complétées"
            icon={BookOpen}
            color="blue"
          />
          <StatsCard
            title="Questions répondues"
            value={userStats.loading ? '...' : userStats.totalQuestions}
            subtitle="Total des questions"
            icon={Target}
            color="green"
          />
          <StatsCard
            title="Temps d'étude"
            value={userStats.loading ? '...' : 
              userStats.timeSpent >= 60 ? 
                `${Math.floor(userStats.timeSpent / 60)}h ${userStats.timeSpent % 60}min` :
                `${userStats.timeSpent}min`
            }
            subtitle="Temps total passé"
            icon={Clock}
            color="purple"
          />
          <StatsCard
            title="Certifications"
            value={userStats.loading ? '...' : userStats.certificationsCount}
            subtitle="Badges obtenus"
            icon={Award}
            color="yellow"
            />
          </div>
        </div>

        {/* Statistiques détaillées en grille */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réponses correctes</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userStats.loading ? '...' : userStats.correctAnswers}
              </div>
              <p className="text-xs text-muted-foreground">
                {userStats.loading ? '' : 
                  `${userStats.totalQuestions > 0 ? Math.round((userStats.correctAnswers / userStats.totalQuestions) * 100) : 0}% de réussite`
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réponses incorrectes</CardTitle>
              <BarChart3 className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {userStats.loading ? '...' : userStats.incorrectAnswers}
              </div>
              <p className="text-xs text-muted-foreground">
                Questions à retravailler
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Niveau actuel</CardTitle>
              <Award className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {userStats.loading ? '...' : 
                  userStats.currentLevel === 1 ? 'Élémentaire' :
                  userStats.currentLevel === 2 ? 'Intermédiaire' :
                  userStats.currentLevel === 3 ? 'Avancé' :
                  userStats.currentLevel === 4 ? 'Expert' :
                  userStats.currentLevel === 5 ? 'Maître' : 'Élémentaire'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Niveau {userStats.loading ? '1' : userStats.currentLevel}
              </p>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Graphiques et visualisations */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="grid gap-6 lg:grid-cols-2">
          {/* Graphique en camembert */}
          <ProgressChart
            correctAnswers={userStats.correctAnswers}
            incorrectAnswers={userStats.incorrectAnswers}
            loading={userStats.loading}
          />
          
          {/* Jauge de score */}
          <ScoreGauge
            score={userStats.progressPercentage}
            loading={userStats.loading}
            />
          </div>
        </div>

        {/* Graphiques détaillés */}
        <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="grid gap-6 lg:grid-cols-2">
          {/* Graphique temps d'étude */}
          <StudyTimeChart
            timeSpent={userStats.timeSpent}
            sessionsCount={userStats.totalTests}
            loading={userStats.loading}
          />
          
          {/* Heatmap d'activité */}
          <ActivityHeatmap
            totalQuestions={userStats.totalQuestions}
            sessionsCount={userStats.totalTests}
            loading={userStats.loading}
            />
          </div>
        </div>

      </div>
    </div>
    </AuthGuard>
  );
};

export default Dashboard;