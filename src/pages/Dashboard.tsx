import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const userStats = useUserStats();
  const { isAdmin } = useIsAdmin();
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
              <CardTitle>Commencer un test</CardTitle>
              <CardDescription>
                Testez vos connaissances et progressez dans votre apprentissage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full sm:w-auto" onClick={() => navigate('/test')}>
                Démarrer un nouveau test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;