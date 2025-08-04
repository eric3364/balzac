import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, BarChart3, Shield, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: number;
  email: string;
  is_super_admin: boolean;
  user_id: string | null;
  created_at: string;
}

interface UserStats {
  total_users: number;
  total_test_sessions: number;
  total_certifications: number;
  avg_study_time: number;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, loading, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_super_admin');
      
      if (error) {
        console.error('Erreur lors de la vérification admin:', error);
        navigate('/dashboard');
        return;
      }

      if (!data) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les droits d'administration",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await loadAdminData();
    } catch (error) {
      console.error('Erreur:', error);
      navigate('/dashboard');
    }
  };

  const loadAdminData = async () => {
    try {
      // Charger la liste des administrateurs
      const { data: admins, error: adminError } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: true });

      if (adminError) throw adminError;
      setAdministrators(admins || []);

      // Charger les statistiques générales
      const [usersResponse, sessionsResponse, certificationsResponse] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('test_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('user_certifications').select('id', { count: 'exact', head: true })
      ]);

      setUserStats({
        total_users: usersResponse.count || 0,
        total_test_sessions: sessionsResponse.count || 0,
        total_certifications: certificationsResponse.count || 0,
        avg_study_time: 0 // À calculer si nécessaire
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'administration",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Administration Balzac</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-primary">Administration</h1>
                  <p className="text-sm text-muted-foreground">Balzac Certification</p>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Super Admin
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistiques générales */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground">Total d'utilisateurs inscrits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_test_sessions || 0}</div>
              <p className="text-xs text-muted-foreground">Sessions de test effectuées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certifications</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_certifications || 0}</div>
              <p className="text-xs text-muted-foreground">Certifications délivrées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{administrators.length}</div>
              <p className="text-xs text-muted-foreground">Comptes administrateurs</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets d'administration */}
        <Tabs defaultValue="administrators" className="space-y-6">
          <TabsList className="grid w-full lg:w-[400px] grid-cols-2">
            <TabsTrigger value="administrators">Administrateurs</TabsTrigger>
            <TabsTrigger value="settings">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="administrators" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administrateurs du système</CardTitle>
                <CardDescription>
                  Gérez les comptes administrateurs et leurs permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {administrators.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{admin.email}</span>
                        <span className="text-sm text-muted-foreground">
                          Créé le {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {admin.is_super_admin && (
                          <Badge variant="default">Super Admin</Badge>
                        )}
                        {!admin.user_id && (
                          <Badge variant="outline">Non connecté</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration du site</CardTitle>
                <CardDescription>
                  Paramètres globaux de l'application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Paramètres des tests</h3>
                    <p className="text-sm text-muted-foreground">
                      Configuration des questions par test, niveaux de difficulté, etc.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Gestion des certifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Critères de validation et modèles de certificats
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;