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
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save, Plus, Edit2, Trash2 } from 'lucide-react';
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

interface DifficultyLevel {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  
  // État pour la gestion des niveaux de difficulté
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DifficultyLevel | null>(null);
  const [levelForm, setLevelForm] = useState({
    level_number: 1,
    name: '',
    description: '',
    color: '#6366f1',
    is_active: true
  });

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
      
      // Charger les niveaux de difficulté
      await loadDifficultyLevels();

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

  // Fonctions pour gérer les niveaux de difficulté
  const loadDifficultyLevels = async () => {
    try {
      const { data: levels, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      setDifficultyLevels(levels || []);
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux:', error);
    }
  };

  const openLevelDialog = (level?: DifficultyLevel) => {
    if (level) {
      setEditingLevel(level);
      setLevelForm({
        level_number: level.level_number,
        name: level.name,
        description: level.description || '',
        color: level.color,
        is_active: level.is_active
      });
    } else {
      setEditingLevel(null);
      const nextLevel = Math.max(...difficultyLevels.map(l => l.level_number), 0) + 1;
      setLevelForm({
        level_number: nextLevel,
        name: '',
        description: '',
        color: '#6366f1',
        is_active: true
      });
    }
    setIsLevelDialogOpen(true);
  };

  const saveDifficultyLevel = async () => {
    try {
      if (editingLevel) {
        // Modifier un niveau existant
        const { error } = await supabase
          .from('difficulty_levels')
          .update({
            level_number: levelForm.level_number,
            name: levelForm.name,
            description: levelForm.description || null,
            color: levelForm.color,
            is_active: levelForm.is_active
          })
          .eq('id', editingLevel.id);

        if (error) throw error;
        
        toast({
          title: "Niveau modifié",
          description: "Le niveau de difficulté a été mis à jour avec succès"
        });
      } else {
        // Créer un nouveau niveau
        const { error } = await supabase
          .from('difficulty_levels')
          .insert({
            level_number: levelForm.level_number,
            name: levelForm.name,
            description: levelForm.description || null,
            color: levelForm.color,
            is_active: levelForm.is_active,
            created_by: user?.id
          });

        if (error) throw error;
        
        toast({
          title: "Niveau créé",
          description: "Le nouveau niveau de difficulté a été créé avec succès"
        });
      }

      setIsLevelDialogOpen(false);
      await loadDifficultyLevels();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le niveau de difficulté",
        variant: "destructive"
      });
    }
  };

  const deleteDifficultyLevel = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce niveau de difficulté ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('difficulty_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Niveau supprimé",
        description: "Le niveau de difficulté a été supprimé avec succès"
      });
      
      await loadDifficultyLevels();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le niveau de difficulté",
        variant: "destructive"
      });
    }
  }

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

                  {/* Gestion des niveaux de difficulté */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Niveaux de difficulté</Label>
                        <p className="text-xs text-muted-foreground">
                          Gérez les niveaux de difficulté personnalisés avec noms et descriptions
                        </p>
                      </div>
                      <Button onClick={() => openLevelDialog()} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un niveau
                      </Button>
                    </div>
                    
                    <div className="grid gap-3">
                      {difficultyLevels.map((level) => (
                        <div
                          key={level.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: level.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  Niveau {level.level_number}: {level.name}
                                </span>
                                {!level.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    Inactif
                                  </Badge>
                                )}
                              </div>
                              {level.description && (
                                <p className="text-xs text-muted-foreground">
                                  {level.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openLevelDialog(level)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => deleteDifficultyLevel(level.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {difficultyLevels.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Aucun niveau de difficulté configuré</p>
                          <p className="text-xs">Cliquez sur "Ajouter un niveau" pour commencer</p>
                        </div>
                      )}
                    </div>
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

      {/* Dialog pour créer/modifier un niveau de difficulté */}
      <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Modifier le niveau' : 'Ajouter un niveau'}
            </DialogTitle>
            <DialogDescription>
              {editingLevel 
                ? 'Modifiez les informations du niveau de difficulté'
                : 'Créez un nouveau niveau de difficulté personnalisé'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_number" className="text-right">
                Numéro
              </Label>
              <Input
                id="level_number"
                type="number"
                min="1"
                max="20"
                value={levelForm.level_number}
                onChange={(e) => setLevelForm({
                  ...levelForm,
                  level_number: parseInt(e.target.value) || 1
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_name" className="text-right">
                Nom
              </Label>
              <Input
                id="level_name"
                value={levelForm.name}
                onChange={(e) => setLevelForm({
                  ...levelForm,
                  name: e.target.value
                })}
                className="col-span-3"
                placeholder="Ex: Débutant, Intermédiaire..."
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_description" className="text-right">
                Description
              </Label>
              <Input
                id="level_description"
                value={levelForm.description}
                onChange={(e) => setLevelForm({
                  ...levelForm,
                  description: e.target.value
                })}
                className="col-span-3"
                placeholder="Description du niveau (optionnel)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_color" className="text-right">
                Couleur
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="level_color"
                  type="color"
                  value={levelForm.color}
                  onChange={(e) => setLevelForm({
                    ...levelForm,
                    color: e.target.value
                  })}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={levelForm.color}
                  onChange={(e) => setLevelForm({
                    ...levelForm,
                    color: e.target.value
                  })}
                  className="flex-1"
                  placeholder="#6366f1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_active" className="text-right">
                Actif
              </Label>
              <div className="col-span-3">
                <Switch
                  id="level_active"
                  checked={levelForm.is_active}
                  onCheckedChange={(checked) => setLevelForm({
                    ...levelForm,
                    is_active: checked
                  })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsLevelDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={saveDifficultyLevel}
              disabled={!levelForm.name.trim()}
            >
              {editingLevel ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;