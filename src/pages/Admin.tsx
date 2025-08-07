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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BadgePreview, BadgeSelector } from '@/components/BadgePreview';
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save, Plus, Edit2, Trash2, Award, FileText, Upload, Download, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HomepageAssetUploader } from '@/components/HomepageAssetUploader';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { UserManagement } from '@/components/UserManagement';
import { FooterConfigForm } from '@/components/FooterConfigForm';

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
  questions_percentage_per_level: number;
}

interface DifficultyLevel {
  id: string;
  level_number: number;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface CertificateTemplate {
  id: string;
  difficulty_level_id: string;
  name: string;
  description: string;
  certificate_title: string;
  certificate_subtitle: string;
  certificate_text: string;
  certificate_background_color: string;
  certificate_border_color: string;
  certificate_text_color: string;
  min_score_required: number;
  badge_icon: string;
  badge_color: string;
  badge_background_color: string;
  badge_size: string;
  custom_badge_url: string;
  price_euros: number;
  free_sessions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Question {
  id: number;
  level: number;
  content: string;
  type: string;
  rule: string | null;
  answer: string;
  choices: string[] | null;
  explanation: string | null;
  created_at: string;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config: homepageAssets, updateConfig: updateHomepageAssets } = useHomepageConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    questions_per_test: 20,
    max_difficulty_level: 5,
    min_passing_score: 80,
    time_limit_minutes: 60,
    allow_retake: true,
    shuffle_questions: true,
    show_immediate_feedback: false,
    questions_percentage_per_level: 20
  });

  // Fonction pour vérifier si l'utilisateur est admin
  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      navigate('/dashboard');
    }
  };

  const loadAdministrators = async () => {
    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdministrators(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: authUsersCount } = await supabase.functions.invoke('get-auth-users-count');
      
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      const { data: sessions, error: sessionsError } = await supabase
        .from('test_sessions')
        .select('id');

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id');

      const { data: certifications, error: certificationsError } = await supabase
        .from('user_certifications')
        .select('id');

      setUserStats({
        total_users: users?.length || 0,
        total_auth_users: authUsersCount?.count || 0,
        total_test_sessions: sessions?.length || 0,
        total_questions: questions?.length || 0,
        total_certifications: certifications?.length || 0,
        avg_study_time: 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const [savingConfig, setSavingConfig] = useState(false);
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [certificates, setCertificates] = useState<CertificateTemplate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsStats, setQuestionsStats] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  useEffect(() => {
    if (isAdmin) {
      loadAdministrators();
      loadUserStats();
      loadTestConfig();
      loadDifficultyLevels();
      loadCertificates();
      loadQuestions();
    }
  }, [isAdmin]);

  const loadTestConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'questions_per_test',
          'max_difficulty_level', 
          'min_passing_score',
          'time_limit_minutes',
          'allow_retake',
          'shuffle_questions',
          'show_immediate_feedback',
          'questions_percentage_per_level'
        ]);

      if (error) throw error;

      if (data) {
        const configObj = data.reduce((acc, { config_key, config_value }) => {
          acc[config_key] = config_value;
          return acc;
        }, {} as Record<string, any>);

        setTestConfig(prev => ({
          ...prev,
          questions_per_test: Number(configObj.questions_per_test) || prev.questions_per_test,
          max_difficulty_level: Number(configObj.max_difficulty_level) || prev.max_difficulty_level,
          min_passing_score: Number(configObj.min_passing_score) || prev.min_passing_score,
          time_limit_minutes: Number(configObj.time_limit_minutes) || prev.time_limit_minutes,
          allow_retake: configObj.allow_retake !== undefined ? Boolean(configObj.allow_retake) : prev.allow_retake,
          shuffle_questions: configObj.shuffle_questions !== undefined ? Boolean(configObj.shuffle_questions) : prev.shuffle_questions,
          show_immediate_feedback: configObj.show_immediate_feedback !== undefined ? Boolean(configObj.show_immediate_feedback) : prev.show_immediate_feedback,
          questions_percentage_per_level: Number(configObj.questions_percentage_per_level) || prev.questions_percentage_per_level,
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  const saveTestConfig = async () => {
    setSavingConfig(true);
    try {
      const configEntries = Object.entries(testConfig).map(([key, value]) => ({
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('site_configuration')
        .upsert(configEntries);

      if (error) throw error;

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres des tests ont été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Placeholder functions for difficulty levels, certificates, questions loading and management
  // These should be implemented similarly to the above functions, managing state and supabase calls

  const loadDifficultyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      setDifficultyLevels(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux:', error);
    }
  };

  const loadCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*');

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des certificats:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);

      // Calculate stats per level
      const stats: Record<number, number> = {};
      data?.forEach(q => {
        stats[q.level] = (stats[q.level] || 0) + 1;
      });
      setQuestionsStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
            <p className="text-muted-foreground">
              Gérez les utilisateurs, les paramètres et le contenu de la plateforme
            </p>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="students">Apprenants</TabsTrigger>
            <TabsTrigger value="homepage">Page d'accueil</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
            <TabsTrigger value="levels">Niveaux & Certifications</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistiques générales
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble de l'activité de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userStats.total_auth_users}</p>
                      <p className="text-sm text-muted-foreground">Utilisateurs inscrits</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userStats.total_test_sessions}</p>
                      <p className="text-sm text-muted-foreground">Sessions de test</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userStats.total_questions}</p>
                      <p className="text-sm text-muted-foreground">Questions créées</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userStats.total_certifications}</p>
                      <p className="text-sm text-muted-foreground">Certifications délivrées</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p>Impossible de charger les statistiques</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="footer" className="space-y-6">
            <FooterConfigForm />
          </TabsContent>

          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de la page d'accueil</CardTitle>
                <CardDescription>
                  Paramétrez les visuels et textes affichés sur la page d'accueil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p>Configuration de la page d'accueil disponible via le hook useHomepageConfig</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="levels" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Niveaux & Certifications
                </CardTitle>
                <CardDescription>
                  Gérez les niveaux de difficulté et configurez leurs certifications associées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p>Configuration des niveaux en cours de développement...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Questions</CardTitle>
                <CardDescription>
                  Créez et gérez les questions pour chaque niveau de difficulté
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p>Gestion des questions en cours de développement...</p>
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

                  {/* Division des niveaux en sessions */}
                  <div className="space-y-2">
                    <Label htmlFor="questions_percentage">Division des niveaux en sessions</Label>
                    <Select
                      value={testConfig.questions_percentage_per_level?.toString() || "20"}
                      onValueChange={(value) => setTestConfig({
                        ...testConfig,
                        questions_percentage_per_level: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le pourcentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5% - 20 sessions par niveau</SelectItem>
                        <SelectItem value="10">10% - 10 sessions par niveau</SelectItem>
                        <SelectItem value="20">20% - 5 sessions par niveau</SelectItem>
                        <SelectItem value="25">25% - 4 sessions par niveau</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Détermine le nombre de questions par session d'examen. Par exemple : 20% sur 100 questions = 20 questions par session, numérotées 1.1, 1.2, 1.3, etc.
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
