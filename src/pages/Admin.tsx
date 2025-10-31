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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BadgeConfiguration } from '@/components/BadgeConfiguration';
import { CertificationBadge } from '@/components/CertificationBadge';
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save, Plus, Edit2, Trash2, Award, FileText, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/UserManagement';
import { QuestionsManager } from '@/components/QuestionsManager';
import { FinanceManager } from '@/components/FinanceManager';
import { LevelsAndCertificatesManager } from '@/components/LevelsAndCertificatesManager';
import { TestSettingsManager } from '@/components/TestSettingsManager';
import { HomepageManager } from '@/components/HomepageManager';
import { useConnectionStats } from '@/hooks/useConnectionStats';

interface AdminUser {
  id: number;
  email: string;
  is_super_admin: boolean;
  user_id: string | null;
  created_at: string | null;
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

interface Question {
  id: number;
  level: number;
  content: string;
  type: string;
  rule: string | null;
  answer: string;          // ← toujours une string, on ne la parse jamais
  choices: string[] | null;
  explanation: string | null;
  created_at: string;
}

// Helper : normalise la colonne `choices` (text[] ou string JSON) en string[]
function normalizeChoices(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.startsWith('[')) {
      try {
        const arr = JSON.parse(t);
        return Array.isArray(arr) ? arr.map(String) : [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("stats");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const connectionStats = useConnectionStats();

  // --- Vérifie si l'utilisateur est admin (RPC is_super_admin + fallback table administrators)
  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data: isAdminFlag, error: rpcErr } = await supabase.rpc('is_super_admin');
      if (!rpcErr && isAdminFlag === true) {
        setIsAdmin(true);
        setIsSuperAdmin(true);
        return;
      }
      const { data, error } = await supabase
        .from('administrators')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        // L'utilisateur est un administrateur
        setIsAdmin(true);
        setIsSuperAdmin(data.is_super_admin || false);
        return;
      }
      
      // Pas un administrateur, rediriger vers le dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('checkAdminStatus error:', err);
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
      setAdministrators((data || []).map(admin => ({
        ...admin,
        is_super_admin: admin.is_super_admin || false,
        created_at: admin.created_at || ''
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs:', error);
    }
  };

  // --- Stats
  const loadUserStats = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingStats(true);
    try {
      const { count: authUsersCount, error: usersCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (usersCountError) console.error('profiles count error:', usersCountError);

      const { data: users, error: profilesErr } = await supabase
        .from('profiles')
        .select('id');

      const { data: sessions, error: sessionsErr } = await supabase
        .from('test_sessions')
        .select('id');

      const { data: questions, error: questionsErr } = await supabase
        .from('questions')
        .select('id');

      const { data: certifications, error: certsErr } = await supabase
        .from('user_certifications')
        .select('id');

      if (profilesErr) console.error(profilesErr);
      if (sessionsErr) console.error(sessionsErr);
      if (questionsErr) console.error(questionsErr);
      if (certsErr) console.error(certsErr);

      setUserStats({
        total_users: users?.length ?? 0,
        total_auth_users: Number(authUsersCount ?? 0),
        total_test_sessions: sessions?.length ?? 0,
        total_questions: questions?.length ?? 0,
        total_certifications: certifications?.length ?? 0,
        avg_study_time: 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoadingData(false);
      if (showRefreshing) setRefreshingStats(false);
    }
  };

  const refreshStats = async () => {
    await Promise.all([
      loadUserStats(true),
      loadQuestions(),
      connectionStats.refetchStats?.()
    ]);
    toast({
      title: "Statistiques mises à jour",
      description: "Les données ont été actualisées avec succès.",
    });
  };

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
      loadQuestions();
    }
  }, [isAdmin]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, level, content, type, rule, answer, choices, explanation, created_at')
        .order('level', { ascending: true });

      if (error) throw error;

      const normalized = (data || []).map((q: any) => ({
        id: q.id,
        level: q.level ?? 1,
        content: q.content ?? '',
        type: q.type ?? 'multiple_choice',
        rule: q.rule ?? '',
        answer: q.answer ?? '',                 // ← ne pas parser
        explanation: q.explanation ?? '',
        created_at: q.created_at ?? '',
        choices: normalizeChoices(q.choices)    // ← normalisation robuste
      })) as Question[];

      setQuestions(normalized);

      // Stats par niveau
      const stats: Record<number, number> = {};
      normalized.forEach(q => {
        const lvl = q.level || 1;
        stats[lvl] = (stats[lvl] || 0) + 1;
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
            onClick={() => navigate('/?preview=true')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la page d'accueil
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
            <p className="text-muted-foreground">
              Gérez les utilisateurs, les paramètres et le contenu de la plateforme
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="students">Apprenants</TabsTrigger>
            <TabsTrigger value="homepage">Page d'accueil</TabsTrigger>
            <TabsTrigger value="levels">Certification</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="test-settings">Paramètres des tests</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="finance">Finance/admin</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statistiques générales
                    </CardTitle>
                    <CardDescription>
                      Vue d'ensemble de l'activité de la plateforme
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshStats}
                    disabled={refreshingStats || loadingData}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingStats ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {userStats ? (
                  <div className="space-y-6">
                    {/* Statistiques générales */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Utilisateurs totaux</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{userStats.total_auth_users}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Sessions de test</CardTitle>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{userStats.total_test_sessions}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Questions totales</CardTitle>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{userStats.total_questions}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Certifications</CardTitle>
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{userStats.total_certifications}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Questions par niveau</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {Object.entries(questionsStats).map(([level, count]) => (
                              <div key={level} className="flex justify-between text-sm">
                                <span>Niveau {level}:</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Statistiques de connexion */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Statistiques de connexion</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Apprenants actifs (semaine)</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {connectionStats.loading ? (
                                <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                              ) : (
                                connectionStats.weeklyActiveUsers
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Connectés cette semaine
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Apprenants actifs (mois)</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {connectionStats.loading ? (
                                <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                              ) : (
                                connectionStats.monthlyActiveUsers
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Connectés ce mois
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Temps moyen (semaine)</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {connectionStats.loading ? (
                                <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
                              ) : (
                                `${connectionStats.weeklyAvgConnectionTime}min`
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Par session cette semaine
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Temps moyen (mois)</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {connectionStats.loading ? (
                                <div className="animate-pulse bg-muted h-8 w-16 rounded"></div>
                              ) : (
                                `${connectionStats.monthlyAvgConnectionTime}min`
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Par session ce mois
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homepage" className="space-y-6">
            <HomepageManager />
          </TabsContent>

          <TabsContent value="levels" className="space-y-6">
            <LevelsAndCertificatesManager />
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <QuestionsManager />
          </TabsContent>

          {/* Paramètres des tests */}
          <TabsContent value="test-settings" className="space-y-6">
            <TestSettingsManager />
          </TabsContent>

          {/* Finance - Accessible uniquement aux super administrateurs */}
          {isSuperAdmin && (
            <TabsContent value="finance" className="space-y-6">
              <FinanceManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;