import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, loading, signOut } = useAuth();
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
              <CardTitle>Tableau de bord</CardTitle>
              <CardDescription>
                Votre progression et statistiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0%</p>
              <p className="text-sm text-muted-foreground">Progression globale</p>
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
              <p className="text-2xl font-bold">0</p>
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
              <p className="text-2xl font-bold">Élémentaire</p>
              <p className="text-sm text-muted-foreground">Niveau 1</p>
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
              <Button className="w-full sm:w-auto">
                Démarrer un nouveau test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
