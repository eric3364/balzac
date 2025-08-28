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
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save, Plus, Edit2, Trash2, Award, FileText, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HomepageAssetUploader } from '@/components/HomepageAssetUploader';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { UserManagement } from '@/components/UserManagement';
import { QuestionsManager } from '@/components/QuestionsManager';
import { FinanceManager } from '@/components/FinanceManager';
import { FooterManager } from '@/components/FooterManager';
import { LegalPageManager } from '@/components/LegalPageManager';

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

interface DifficultyLevel {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CertificateTemplate {
  id: string;
  difficulty_level_id: string;
  name: string;
  description: string | null;
  certificate_title: string;
  certificate_subtitle: string | null;
  certificate_text: string;
  certificate_background_color: string | null;
  certificate_border_color: string | null;
  certificate_text_color: string | null;
  min_score_required: number;
  badge_icon: string | null;
  badge_color: string | null;
  badge_background_color: string | null;
  badge_size: string | null;
  custom_badge_url: string | null;
  price_euros: number | null;
  free_sessions: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  feature_1_text?: string | null;
  feature_2_text?: string | null;
  feature_3_text?: string | null;
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
  const { config: homepageAssets, updateConfig: updateHomepageAssets } = useHomepageConfig();
  const [activeTab, setActiveTab] = useState("stats");
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

  // --- Vérifie si l'utilisateur est admin (RPC is_super_admin + fallback table administrators)
  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data: isAdminFlag, error: rpcErr } = await supabase.rpc('is_super_admin');
      if (!rpcErr && isAdminFlag === true) {
        setIsAdmin(true);
        return;
      }
      const { data, error } = await supabase
        .from('administrators')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      if (!error && data?.is_super_admin) {
        setIsAdmin(true);
        return;
      }
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
  const loadUserStats = async () => {
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
    }
  };

  const [savingConfig, setSavingConfig] = useState(false);
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [certificates, setCertificates] = useState<CertificateTemplate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsStats, setQuestionsStats] = useState<Record<number, number>>({});
  
  // États pour la configuration du partage de certifications
  const [certConfig, setCertConfig] = useState({
    issuing_organization: '',
    organization_url: '',
    organization_logo: '',
    expiration_months: 24,
    verification_url_template: '',
    context_url: 'https://www.w3.org/2018/credentials/v1',
    credential_type: 'VerifiableCredential',
    achievement_type: 'Achievement',
    criteria_narrative: ''
  });
  const [savingCertConfig, setSavingCertConfig] = useState(false);

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
      loadCertConfig();
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
        updated_by: user?.id || null
      }));

      const { error } = await supabase
        .from('site_configuration')
        .upsert(configEntries, {
          onConflict: 'config_key'
        });

      if (error) throw error;

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres des tests ont été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Admin: Erreur lors de la sauvegarde de la configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const loadDifficultyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      setDifficultyLevels((data || []).map(level => ({
        ...level,
        description: level.description || '',
        color: level.color || '#6366f1',
        created_by: level.created_by || ''
      })));
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
      setCertificates((data || []).map(cert => ({
        ...cert,
        description: cert.description || '',
        certificate_subtitle: cert.certificate_subtitle || '',
        certificate_background_color: cert.certificate_background_color || '#ffffff',
        certificate_border_color: cert.certificate_border_color || '#6366f1',
        certificate_text_color: cert.certificate_text_color || '#000000',
        badge_icon: cert.badge_icon || 'award',
        badge_color: cert.badge_color || '#6366f1',
        badge_background_color: cert.badge_background_color || '#ffffff',
        badge_size: cert.badge_size || 'medium',
        custom_badge_url: cert.custom_badge_url || '',
        price_euros: cert.price_euros || 10,
        free_sessions: cert.free_sessions || 3,
        created_by: cert.created_by || '',
        feature_1_text: cert.feature_1_text || '',
        feature_2_text: cert.feature_2_text || '',
        feature_3_text: cert.feature_3_text || ''
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des certificats:', error);
    }
  };

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

  // Fonctions pour la configuration du partage de certifications
  const loadCertConfig = async () => {
    try {
      const configKeys = [
        'cert_issuing_organization',
        'cert_organization_url', 
        'cert_organization_logo',
        'cert_expiration_months',
        'cert_verification_url_template',
        'cert_context_url',
        'cert_credential_type',
        'cert_achievement_type',
        'cert_criteria_narrative'
      ];

      const { data, error } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', configKeys);

      if (error) throw error;

      const config = data?.reduce((acc, item) => {
        const key = item.config_key.replace('cert_', '');
        acc[key] = item.config_value;
        return acc;
      }, {} as any) || {};

      setCertConfig({
        issuing_organization: config.issuing_organization || '',
        organization_url: config.organization_url || '',
        organization_logo: config.organization_logo || '',
        expiration_months: parseInt(config.expiration_months) || 24,
        verification_url_template: config.verification_url_template || '',
        context_url: config.context_url || 'https://www.w3.org/2018/credentials/v1',
        credential_type: config.credential_type || 'VerifiableCredential',
        achievement_type: config.achievement_type || 'Achievement',
        criteria_narrative: config.criteria_narrative || ''
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration des certifications:', error);
    }
  };

  const saveCertConfig = async () => {
    setSavingCertConfig(true);
    try {
      const configEntries = [
        { key: 'cert_issuing_organization', value: certConfig.issuing_organization },
        { key: 'cert_organization_url', value: certConfig.organization_url },
        { key: 'cert_organization_logo', value: certConfig.organization_logo },
        { key: 'cert_expiration_months', value: certConfig.expiration_months.toString() },
        { key: 'cert_verification_url_template', value: certConfig.verification_url_template },
        { key: 'cert_context_url', value: certConfig.context_url },
        { key: 'cert_credential_type', value: certConfig.credential_type },
        { key: 'cert_achievement_type', value: certConfig.achievement_type },
        { key: 'cert_criteria_narrative', value: certConfig.criteria_narrative }
      ];

      for (const entry of configEntries) {
        const { error } = await supabase
          .from('site_configuration')
          .upsert({
            config_key: entry.key,
            config_value: entry.value,
            updated_by: user?.id
          }, {
            onConflict: 'config_key'
          });
        
        if (error) {
          console.error(`Erreur lors de la sauvegarde de ${entry.key}:`, error);
          throw error;
        }
      }

      toast({
        title: "Configuration sauvegardée",
        description: "La configuration du partage de certifications a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration des certifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    } finally {
      setSavingCertConfig(false);
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="students">Apprenants</TabsTrigger>
            <TabsTrigger value="homepage">Page d'accueil</TabsTrigger>
            <TabsTrigger value="footer">Footer & Légal</TabsTrigger>
            <TabsTrigger value="levels">Niveaux & Certifications</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
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

          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Configuration de la page d'accueil
                </CardTitle>
                <CardDescription>
                  Paramétrez les visuels et textes affichés sur la page d'accueil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Section Images */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Images et visuels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HomepageAssetUploader
                      label="Logo principal"
                      currentUrl={homepageAssets.logoUrl || ''}
                      onUrlChange={(url) => updateHomepageAssets({ logoUrl: url })}
                      bucketPath="logo"
                    />
                    <div className="space-y-3">
                      <HomepageAssetUploader
                        label="Image bannière"
                        currentUrl={homepageAssets.bannerUrl || ''}
                        onUrlChange={(url) => updateHomepageAssets({ bannerUrl: url })}
                        bucketPath="banner"
                      />
                      <div className="space-y-2">
                        <Label htmlFor="banner-opacity">Opacité de l'image (%)</Label>
                        <Input
                          id="banner-opacity"
                          type="number"
                          min="0"
                          max="100"
                          value={homepageAssets.bannerOpacity || 100}
                          onChange={(e) => updateHomepageAssets({ bannerOpacity: Number(e.target.value) })}
                          className="w-24"
                        />
                        <p className="text-sm text-muted-foreground">
                          Contrôle la transparence de l'image de fond (0 = transparent, 100 = opaque)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Couleurs du texte */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Couleurs du texte du bandeau</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="badge-color">Couleur du badge</Label>
                      <Input
                        id="badge-color"
                        type="color"
                        value={homepageAssets.heroBadgeColor || '#6366f1'}
                        onChange={(e) => updateHomepageAssets({ heroBadgeColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du badge "Plateforme de certification nouvelle génération"
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="title-color">Couleur du titre principal</Label>
                      <Input
                        id="title-color"
                        type="color"
                        value={homepageAssets.heroTitleColor || '#000000'}
                        onChange={(e) => updateHomepageAssets({ heroTitleColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du titre principal du bandeau
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description-color">Couleur de la description</Label>
                      <Input
                        id="description-color"
                        type="color"
                        value={homepageAssets.heroDescriptionColor || '#6b7280'}
                        onChange={(e) => updateHomepageAssets({ heroDescriptionColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du texte de description
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section Couleurs des titres de section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Couleurs des titres de section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="features-title-color">Couleur du titre "Fonctionnalités"</Label>
                      <Input
                        id="features-title-color"
                        type="color"
                        value={homepageAssets.featuresTitleColor || '#6366f1'}
                        onChange={(e) => updateHomepageAssets({ featuresTitleColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du titre de la section fonctionnalités
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stats-title-color">Couleur du titre "Statistiques"</Label>
                      <Input
                        id="stats-title-color"
                        type="color"
                        value={homepageAssets.statsTitleColor || '#6366f1'}
                        onChange={(e) => updateHomepageAssets({ statsTitleColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du titre de la section statistiques
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cta-title-color">Couleur du titre "Call-to-Action"</Label>
                      <Input
                        id="cta-title-color"
                        type="color"
                        value={homepageAssets.ctaTitleColor || '#6366f1'}
                        onChange={(e) => updateHomepageAssets({ ctaTitleColor: e.target.value })}
                        className="h-10 w-full"
                      />
                      <p className="text-sm text-muted-foreground">
                        Couleur du titre de la section appel à l'action
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button 
                    onClick={async () => {
                      try {
                        await updateHomepageAssets(homepageAssets);
                        toast({
                          title: "Modifications sauvegardées",
                          description: "Les modifications de la page d'accueil ont été enregistrées avec succès."
                        });
                        setTimeout(() => setActiveTab("stats"), 1000);
                      } catch (error) {
                        console.error('Erreur lors de la sauvegarde:', error);
                        toast({
                          title: "Erreur",
                          description: "Impossible de sauvegarder les modifications.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder les modifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer & Mentions légales */}
          <TabsContent value="footer" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div><FooterManager /></div>
              <div><LegalPageManager /></div>
            </div>
          </TabsContent>

          {/* Niveaux & Certifications */}
          <TabsContent value="levels" className="space-y-6">
            {/* … UI de gestion des niveaux/certifs inchangée … */}
          </TabsContent>

          {/* Questions */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Statistiques des questions par niveau
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble de la répartition des questions par niveau de difficulté
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(questionsStats).length > 0 ? (
                    Object.entries(questionsStats).map(([level, count]) => (
                      <div key={level} className="p-4 border rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{count}</p>
                        <p className="text-sm text-muted-foreground">Niveau {level}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">Aucune question trouvée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <QuestionsManager
              difficultyLevels={difficultyLevels.map(level => ({
                ...level,
                color: level.color || '#6366f1'
              }))}
            />
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="space-y-6">
            <FinanceManager />
          </TabsContent>

          {/* Paramètres */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres des tests</CardTitle>
                <CardDescription>
                  Configuration des questions par test, niveaux de difficulté et autres paramètres
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* … tout le bloc d’options existant … */}
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
