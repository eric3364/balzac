import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save } from 'lucide-react';
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
  total_auth_users: number;
  total_test_sessions: number;
  total_questions: number;
  total_certifications: number;
  avg_study_time: number;
}

interface TestConfig {
  questions_per_test: number;
  max_difficulty_level: number;
  min_passing_score: number;
  time_limit_minutes: number;
  allow_retake: boolean;
  shuffle_questions: boolean;
  show_immediate_feedback: boolean;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    questions_per_test: 30,
    max_difficulty_level: 5,
    min_passing_score: 70,
    time_limit_minutes: 60,
    allow_retake: true,
    shuffle_questions: true,
    show_immediate_feedback: false
  });
  const [savingConfig, setSavingConfig] = useState(false);

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
      const [usersResponse, sessionsResponse, questionsResponse, certificationsResponse] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('test_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('user_certifications').select('id', { count: 'exact', head: true })
      ]);

      setUserStats({
        total_users: usersResponse.count || 0,
        total_auth_users: usersResponse.count || 0, // Même valeur pour l'instant
        total_test_sessions: sessionsResponse.count || 0,
        total_questions: questionsResponse.count || 0,
        total_certifications: certificationsResponse.count || 0,
        avg_study_time: 0 // À calculer si nécessaire
      });

      // Charger la configuration des tests
      await loadTestConfig();

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

  const loadTestConfig = async () => {
    try {
      const { data: configs, error } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'questions_per_test', 
          'max_difficulty_level', 
          'min_passing_score', 
          'time_limit_minutes',
          'allow_retake',
          'shuffle_questions',
          'show_immediate_feedback'
        ]);

      if (error) throw error;

      if (configs && configs.length > 0) {
        const configObj = configs.reduce((acc, config) => {
          acc[config.config_key] = config.config_value;
          return acc;
        }, {} as any);

        setTestConfig({
          questions_per_test: configObj.questions_per_test || 30,
          max_difficulty_level: configObj.max_difficulty_level || 5,
          min_passing_score: configObj.min_passing_score || 70,
          time_limit_minutes: configObj.time_limit_minutes || 60,
          allow_retake: configObj.allow_retake !== false,
          shuffle_questions: configObj.shuffle_questions !== false,
          show_immediate_feedback: configObj.show_immediate_feedback || false
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  const saveTestConfig = async () => {
    setSavingConfig(true);
    try {
      const configEntries = [
        { config_key: 'questions_per_test', config_value: testConfig.questions_per_test },
        { config_key: 'max_difficulty_level', config_value: testConfig.max_difficulty_level },
        { config_key: 'min_passing_score', config_value: testConfig.min_passing_score },
        { config_key: 'time_limit_minutes', config_value: testConfig.time_limit_minutes },
        { config_key: 'allow_retake', config_value: testConfig.allow_retake },
        { config_key: 'shuffle_questions', config_value: testConfig.shuffle_questions },
        { config_key: 'show_immediate_feedback', config_value: testConfig.show_immediate_feedback }
      ];

      for (const entry of configEntries) {
        const { error } = await supabase
          .from('site_configuration')
          .upsert({
            config_key: entry.config_key,
            config_value: entry.config_value,
            updated_by: user?.id
          }, {
            onConflict: 'config_key'
          });

        if (error) throw error;
      }

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres des tests ont été mis à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    } finally {
      setSavingConfig(false);
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
              <div className="text-2xl font-bold">{userStats?.total_auth_users || 0}</div>
              <p className="text-xs text-muted-foreground">
                Utilisateurs authentifiés ({userStats?.total_users || 0} profils)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_questions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Questions disponibles ({userStats?.total_test_sessions || 0} sessions)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certifications</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.total_certifications || 0}</div>
              <p className="text-xs text-muted-foreground">Certifications distribuées aux utilisateurs</p>
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
                <CardTitle>Paramètres des tests</CardTitle>
                <CardDescription>
                  Configuration des questions par test, niveaux de difficulté et autres paramètres
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Questions par test */}
                  <div className="space-y-2">
                    <Label htmlFor="questions_per_test">Nombre de questions par test</Label>
                    <Input
                      id="questions_per_test"
                      type="number"
                      min="5"
                      max="100"
                      value={testConfig.questions_per_test}
                      onChange={(e) => setTestConfig({
                        ...testConfig,
                        questions_per_test: parseInt(e.target.value) || 30
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nombre de questions à afficher dans chaque test
                    </p>
                  </div>

                  {/* Niveau de difficulté maximum */}
                  <div className="space-y-2">
                    <Label htmlFor="max_difficulty">Niveau de difficulté maximum</Label>
                    <Select 
                      value={testConfig.max_difficulty_level.toString()} 
                      onValueChange={(value) => setTestConfig({
                        ...testConfig,
                        max_difficulty_level: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Niveau 1 (Débutant)</SelectItem>
                        <SelectItem value="2">Niveau 2 (Élémentaire)</SelectItem>
                        <SelectItem value="3">Niveau 3 (Intermédiaire)</SelectItem>
                        <SelectItem value="4">Niveau 4 (Avancé)</SelectItem>
                        <SelectItem value="5">Niveau 5 (Expert)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Niveau maximum des questions à inclure dans les tests
                    </p>
                  </div>

                  {/* Score minimum de réussite */}
                  <div className="space-y-2">
                    <Label htmlFor="min_passing_score">Score minimum de réussite (%)</Label>
                    <Input
                      id="min_passing_score"
                      type="number"
                      min="0"
                      max="100"
                      value={testConfig.min_passing_score}
                      onChange={(e) => setTestConfig({
                        ...testConfig,
                        min_passing_score: parseInt(e.target.value) || 70
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pourcentage minimum requis pour réussir un test
                    </p>
                  </div>

                  {/* Temps limite */}
                  <div className="space-y-2">
                    <Label htmlFor="time_limit">Temps limite (minutes)</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      min="5"
                      max="300"
                      value={testConfig.time_limit_minutes}
                      onChange={(e) => setTestConfig({
                        ...testConfig,
                        time_limit_minutes: parseInt(e.target.value) || 60
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Durée maximale allouée pour compléter un test
                    </p>
                  </div>
                </div>

                {/* Options booléennes */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Options des tests</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow_retake">Autoriser les reprises</Label>
                      <p className="text-xs text-muted-foreground">
                        Permettre aux utilisateurs de reprendre un test échoué
                      </p>
                    </div>
                    <Switch
                      id="allow_retake"
                      checked={testConfig.allow_retake}
                      onCheckedChange={(checked) => setTestConfig({
                        ...testConfig,
                        allow_retake: checked
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="shuffle_questions">Mélanger les questions</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher les questions dans un ordre aléatoire
                      </p>
                    </div>
                    <Switch
                      id="shuffle_questions"
                      checked={testConfig.shuffle_questions}
                      onCheckedChange={(checked) => setTestConfig({
                        ...testConfig,
                        shuffle_questions: checked
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="immediate_feedback">Feedback immédiat</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher les corrections après chaque question
                      </p>
                    </div>
                    <Switch
                      id="immediate_feedback"
                      checked={testConfig.show_immediate_feedback}
                      onCheckedChange={(checked) => setTestConfig({
                        ...testConfig,
                        show_immediate_feedback: checked
                      })}
                    />
                  </div>
                </div>

                {/* Bouton de sauvegarde */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={saveTestConfig} 
                    disabled={savingConfig}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestion des certifications</CardTitle>
                <CardDescription>
                  Critères de validation et modèles de certificats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Configuration des critères de certification à venir...
                  </p>
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