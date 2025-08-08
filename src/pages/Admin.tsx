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
import { BadgePreview, BadgeSelector } from '@/components/BadgePreview';
import { BadgeConfiguration } from '@/components/BadgeConfiguration';
import { Users, Settings, BarChart3, Shield, ArrowLeft, Save, Plus, Edit2, Trash2, Award, FileText, Upload, Download, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HomepageAssetUploader } from '@/components/HomepageAssetUploader';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { useFooterConfig } from '@/hooks/useFooterConfig';
import { UserManagement } from '@/components/UserManagement';
import { FooterConfigForm } from '@/components/FooterConfigForm';
import { QuestionsManager } from '@/components/QuestionsManager';

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
  feature_1_text?: string;
  feature_2_text?: string;
  feature_3_text?: string;
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
  const { config: footerConfig, updateConfig: updateFooterConfig } = useFooterConfig();
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
    console.log('Admin: Début de la sauvegarde des paramètres de test');
    console.log('Admin: Configuration actuelle:', testConfig);
    
    try {
      const configEntries = Object.entries(testConfig).map(([key, value]) => ({
        config_key: key,
        config_value: value,
        updated_by: user?.id || null
      }));

      console.log('Admin: Entrées de configuration à sauvegarder:', configEntries);

      const { error, data } = await supabase
        .from('site_configuration')
        .upsert(configEntries, {
          onConflict: 'config_key'
        });

      console.log('Admin: Résultat de la sauvegarde:', { error, data });

      if (error) throw error;

      console.log('Admin: Sauvegarde des paramètres réussie');
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="students">Apprenants</TabsTrigger>
            <TabsTrigger value="homepage">Page d'accueil</TabsTrigger>
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
                    <HomepageAssetUploader
                      label="Image bannière"
                      currentUrl={homepageAssets.bannerUrl || ''}
                      onUrlChange={(url) => updateHomepageAssets({ bannerUrl: url })}
                      bucketPath="banner"
                    />
                  </div>
                </div>

                {/* Section Titre du site */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Titre du site</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteTitle">Titre principal</Label>
                      <Input
                        id="siteTitle"
                        value={homepageAssets.siteTitle}
                        onChange={(e) => updateHomepageAssets({ siteTitle: e.target.value })}
                        placeholder="Nom de votre site"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteSubtitle">Sous-titre</Label>
                      <Input
                        id="siteSubtitle"
                        value={homepageAssets.siteSubtitle}
                        onChange={(e) => updateHomepageAssets({ siteSubtitle: e.target.value })}
                        placeholder="Slogan ou description courte"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Hero */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Section Hero (bannière principale)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="heroTitle">Titre principal</Label>
                      <Input
                        id="heroTitle"
                        value={homepageAssets.heroTitle}
                        onChange={(e) => updateHomepageAssets({ heroTitle: e.target.value })}
                        placeholder="Titre accrocheur de votre page d'accueil"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heroDescription">Description</Label>
                      <Textarea
                        id="heroDescription"
                        value={homepageAssets.heroDescription}
                        onChange={(e) => updateHomepageAssets({ heroDescription: e.target.value })}
                        placeholder="Description détaillée de votre service"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="heroCta1">Bouton principal</Label>
                        <Input
                          id="heroCta1"
                          value={homepageAssets.heroCta_primary}
                          onChange={(e) => updateHomepageAssets({ heroCta_primary: e.target.value })}
                          placeholder="Ex: Commencer maintenant"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heroCta2">Bouton secondaire</Label>
                        <Input
                          id="heroCta2"
                          value={homepageAssets.heroCta_secondary}
                          onChange={(e) => updateHomepageAssets({ heroCta_secondary: e.target.value })}
                          placeholder="Ex: En savoir plus"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Fonctionnalités */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Section Fonctionnalités</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="featuresTitle">Titre de section</Label>
                      <Input
                        id="featuresTitle"
                        value={homepageAssets.featuresTitle}
                        onChange={(e) => updateHomepageAssets({ featuresTitle: e.target.value })}
                        placeholder="Titre de la section fonctionnalités"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="featuresDescription">Description</Label>
                      <Textarea
                        id="featuresDescription"
                        value={homepageAssets.featuresDescription}
                        onChange={(e) => updateHomepageAssets({ featuresDescription: e.target.value })}
                        placeholder="Description des avantages de votre service"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Statistiques */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Section Statistiques</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Statistique 1</Label>
                      <div className="space-y-2">
                        <Input
                          value={homepageAssets.stat1Number}
                          onChange={(e) => updateHomepageAssets({ stat1Number: e.target.value })}
                          placeholder="10K+"
                        />
                        <Input
                          value={homepageAssets.stat1Label}
                          onChange={(e) => updateHomepageAssets({ stat1Label: e.target.value })}
                          placeholder="Utilisateurs actifs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Statistique 2</Label>
                      <div className="space-y-2">
                        <Input
                          value={homepageAssets.stat2Number}
                          onChange={(e) => updateHomepageAssets({ stat2Number: e.target.value })}
                          placeholder="95%"
                        />
                        <Input
                          value={homepageAssets.stat2Label}
                          onChange={(e) => updateHomepageAssets({ stat2Label: e.target.value })}
                          placeholder="Taux de satisfaction"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Statistique 3</Label>
                      <div className="space-y-2">
                        <Input
                          value={homepageAssets.stat3Number}
                          onChange={(e) => updateHomepageAssets({ stat3Number: e.target.value })}
                          placeholder="15+"
                        />
                        <Input
                          value={homepageAssets.stat3Label}
                          onChange={(e) => updateHomepageAssets({ stat3Label: e.target.value })}
                          placeholder="Niveaux disponibles"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Call-to-Action final */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Section Call-to-Action finale</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ctaTitle">Titre de l'appel à l'action</Label>
                      <Input
                        id="ctaTitle"
                        value={homepageAssets.ctaTitle}
                        onChange={(e) => updateHomepageAssets({ ctaTitle: e.target.value })}
                        placeholder="Titre incitatif pour passer à l'action"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaDescription">Description</Label>
                      <Textarea
                        id="ctaDescription"
                        value={homepageAssets.ctaDescription}
                        onChange={(e) => updateHomepageAssets({ ctaDescription: e.target.value })}
                        placeholder="Message d'encouragement final"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaButton">Texte du bouton</Label>
                      <Input
                        id="ctaButton"
                        value={homepageAssets.ctaButton}
                        onChange={(e) => updateHomepageAssets({ ctaButton: e.target.value })}
                        placeholder="Ex: Commencer maintenant"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Footer & Mentions légales */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">Footer & Mentions légales</h3>
                  
                  {/* Informations de l'entreprise */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Informations de l'entreprise</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Nom de l'entreprise</Label>
                        <Input
                          id="company_name"
                          value={footerConfig.company_name}
                          onChange={(e) => updateFooterConfig({
                            company_name: e.target.value
                          })}
                          placeholder="Balzac Certification"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="company_email">Email de contact</Label>
                        <Input
                          id="company_email"
                          type="email"
                          value={footerConfig.company_email}
                          onChange={(e) => updateFooterConfig({
                            company_email: e.target.value
                          })}
                          placeholder="contact@balzac-certification.fr"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_phone">Téléphone</Label>
                        <Input
                          id="company_phone"
                          value={footerConfig.company_phone}
                          onChange={(e) => updateFooterConfig({
                            company_phone: e.target.value
                          })}
                          placeholder="+33 1 23 45 67 89"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="company_address">Adresse</Label>
                        <Input
                          id="company_address"
                          value={footerConfig.company_address}
                          onChange={(e) => updateFooterConfig({
                            company_address: e.target.value
                          })}
                          placeholder="123 Rue de la Formation, Paris"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Réseaux sociaux */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Réseaux sociaux</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="social_facebook">Facebook</Label>
                        <Input
                          id="social_facebook"
                          value={footerConfig.social_links.facebook}
                          onChange={(e) => updateFooterConfig({
                            social_links: {
                              ...footerConfig.social_links,
                              facebook: e.target.value
                            }
                          })}
                          placeholder="https://facebook.com/balzac-certification"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="social_twitter">Twitter/X</Label>
                        <Input
                          id="social_twitter"
                          value={footerConfig.social_links.twitter}
                          onChange={(e) => updateFooterConfig({
                            social_links: {
                              ...footerConfig.social_links,
                              twitter: e.target.value
                            }
                          })}
                          placeholder="https://twitter.com/balzac_cert"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="social_linkedin">LinkedIn</Label>
                        <Input
                          id="social_linkedin"
                          value={footerConfig.social_links.linkedin}
                          onChange={(e) => updateFooterConfig({
                            social_links: {
                              ...footerConfig.social_links,
                              linkedin: e.target.value
                            }
                          })}
                          placeholder="https://linkedin.com/company/balzac-certification"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="social_instagram">Instagram</Label>
                        <Input
                          id="social_instagram"
                          value={footerConfig.social_links.instagram}
                          onChange={(e) => updateFooterConfig({
                            social_links: {
                              ...footerConfig.social_links,
                              instagram: e.target.value
                            }
                          })}
                          placeholder="https://instagram.com/balzac_certification"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mentions légales */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm border-b pb-2">Mentions légales</h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="mentions_legales">Mentions légales</Label>
                        <Textarea
                          id="mentions_legales"
                          value={footerConfig.mentions_legales}
                          onChange={(e) => updateFooterConfig({
                            mentions_legales: e.target.value
                          })}
                          placeholder="Saisissez les mentions légales..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="politique_confidentialite">Politique de confidentialité</Label>
                        <Textarea
                          id="politique_confidentialite"
                          value={footerConfig.politique_confidentialite}
                          onChange={(e) => updateFooterConfig({
                            politique_confidentialite: e.target.value
                          })}
                          placeholder="Saisissez la politique de confidentialité..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="conditions_utilisation">Conditions d'utilisation</Label>
                        <Textarea
                          id="conditions_utilisation"
                          value={footerConfig.conditions_utilisation}
                          onChange={(e) => updateFooterConfig({
                            conditions_utilisation: e.target.value
                          })}
                          placeholder="Saisissez les conditions d'utilisation..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="copyright_text">Texte de copyright</Label>
                        <Input
                          id="copyright_text"
                          value={footerConfig.copyright_text}
                          onChange={(e) => updateFooterConfig({
                            copyright_text: e.target.value
                          })}
                          placeholder="© 2024 Balzac Certification. Tous droits réservés."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button 
                    onClick={async () => {
                      await updateHomepageAssets({});
                      await updateFooterConfig({});
                      toast({
                        title: "Configuration sauvegardée",
                        description: "Les modifications de la page d'accueil et du footer ont été enregistrées."
                      });
                    }}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder toutes les modifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="levels" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Niveaux de difficulté
                    </CardTitle>
                    <CardDescription>
                      Gérez les niveaux de difficulté et leurs certifications associées
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un niveau
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Nouveau niveau de difficulté</DialogTitle>
                        <DialogDescription>
                          Créez un nouveau niveau avec sa certification associée
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {/* Informations du niveau */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Informations du niveau</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="level_number">Numéro de niveau</Label>
                              <Input id="level_number" type="number" placeholder="1" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="level_name">Nom du niveau</Label>
                              <Input id="level_name" placeholder="Débutant" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="level_description">Description</Label>
                            <Textarea id="level_description" placeholder="Description du niveau de difficulté" rows={2} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="level_color">Couleur</Label>
                            <Input id="level_color" type="color" defaultValue="#6366f1" />
                          </div>
                        </div>

                        {/* Configuration de la certification */}
                        <div className="space-y-4 border-t pt-4">
                          <h4 className="font-medium">Configuration de la certification</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cert_name">Nom de la certification</Label>
                              <Input id="cert_name" placeholder="Certification Niveau Débutant" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cert_price">Prix (€)</Label>
                              <Input id="cert_price" type="number" step="0.01" placeholder="10.00" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="min_score">Score minimum (%)</Label>
                              <Input id="min_score" type="number" placeholder="70" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="free_sessions">Sessions gratuites</Label>
                              <Input id="free_sessions" type="number" placeholder="3" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cert_description">Description de la certification</Label>
                            <Textarea id="cert_description" placeholder="Description de la certification" rows={2} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cert_title">Titre du certificat</Label>
                              <Input id="cert_title" placeholder="Certificat de Français Niveau Débutant" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cert_subtitle">Sous-titre du certificat</Label>
                              <Input id="cert_subtitle" placeholder="Décerné à" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cert_text">Texte du certificat</Label>
                            <Textarea id="cert_text" placeholder="Texte affiché sur le certificat" rows={3} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          Créer le niveau
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {difficultyLevels.length > 0 ? (
                    <div className="grid gap-4">
                      {difficultyLevels.map((level) => {
                        const associatedCert = certificates.find(cert => cert.difficulty_level_id === level.id);
                        return (
                          <div key={level.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant="outline" 
                                  style={{ backgroundColor: level.color + '20', borderColor: level.color, color: level.color }}
                                >
                                  Niveau {level.level_number}
                                </Badge>
                                <div>
                                  <h4 className="font-medium">{level.name}</h4>
                                  <p className="text-sm text-muted-foreground">{level.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={level.is_active ? "default" : "secondary"}>
                                  {level.is_active ? "Actif" : "Inactif"}
                                </Badge>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Modifier le niveau {level.level_number}</DialogTitle>
                                      <DialogDescription>
                                        Modifiez les paramètres du niveau et de sa certification
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      {/* Informations du niveau */}
                                      <div className="space-y-4">
                                        <h4 className="font-medium">Informations du niveau</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Numéro de niveau</Label>
                                            <Input defaultValue={level.level_number} type="number" />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Nom du niveau</Label>
                                            <Input defaultValue={level.name} />
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Description</Label>
                                          <Textarea defaultValue={level.description || ''} rows={2} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Couleur</Label>
                                            <Input type="color" defaultValue={level.color} />
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Switch defaultChecked={level.is_active} />
                                            <Label>Niveau actif</Label>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Configuration de la certification */}
                                      {associatedCert && (
                                        <div className="space-y-4 border-t pt-4">
                                          <h4 className="font-medium">Configuration de la certification</h4>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Nom de la certification</Label>
                                              <Input 
                                                defaultValue={associatedCert.name}
                                                onChange={(e) => {
                                                  // Mettre à jour la valeur dans l'état
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, name: e.target.value }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Prix (€)</Label>
                                              <Input 
                                                defaultValue={associatedCert.price_euros} 
                                                type="number" 
                                                step="0.01"
                                                min="0"
                                                onChange={(e) => {
                                                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, price_euros: value }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Score minimum (%)</Label>
                                              <Input 
                                                defaultValue={associatedCert.min_score_required} 
                                                type="number"
                                                onChange={(e) => {
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, min_score_required: parseInt(e.target.value) || 70 }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Sessions gratuites</Label>
                                              <Input 
                                                defaultValue={associatedCert.free_sessions} 
                                                type="number"
                                                min="0"
                                                onChange={(e) => {
                                                  const value = Math.max(0, parseInt(e.target.value) || 0);
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, free_sessions: value }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Description de la certification</Label>
                                            <Textarea 
                                              defaultValue={associatedCert.description || ''} 
                                              rows={2}
                                              onChange={(e) => {
                                                setCertificates(prev => prev.map(cert => 
                                                  cert.id === associatedCert.id 
                                                    ? { ...cert, description: e.target.value }
                                                    : cert
                                                ));
                                              }}
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Titre du certificat</Label>
                                              <Input 
                                                defaultValue={associatedCert.certificate_title}
                                                onChange={(e) => {
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, certificate_title: e.target.value }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Sous-titre du certificat</Label>
                                              <Input 
                                                defaultValue={associatedCert.certificate_subtitle || ''}
                                                onChange={(e) => {
                                                  setCertificates(prev => prev.map(cert => 
                                                    cert.id === associatedCert.id 
                                                      ? { ...cert, certificate_subtitle: e.target.value }
                                                      : cert
                                                  ));
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Texte du certificat</Label>
                                            <Textarea 
                                              defaultValue={associatedCert.certificate_text} 
                                              rows={3}
                                              onChange={(e) => {
                                                setCertificates(prev => prev.map(cert => 
                                                  cert.id === associatedCert.id 
                                                    ? { ...cert, certificate_text: e.target.value }
                                                    : cert
                                                ));
                                              }}
                                            />
                                          </div>
                                           <div className="flex items-center space-x-2">
                                             <Switch 
                                               defaultChecked={associatedCert.is_active}
                                               onCheckedChange={(checked) => {
                                                 setCertificates(prev => prev.map(cert => 
                                                   cert.id === associatedCert.id 
                                                     ? { ...cert, is_active: checked }
                                                     : cert
                                                 ));
                                               }}
                                             />
                                             <Label>Certification active</Label>
                                           </div>

                                            {/* Configuration du badge */}
                                            <div className="space-y-4 border-t pt-4">
                                              <BadgeConfiguration
                                                initialConfig={{
                                                  badge_icon: associatedCert.badge_icon || 'star',
                                                  badge_color: associatedCert.badge_color || '#6366f1',
                                                  badge_background_color: associatedCert.badge_background_color || '#ffffff',
                                                  badge_size: associatedCert.badge_size || 'medium',
                                                  custom_badge_url: associatedCert.custom_badge_url || undefined
                                                }}
                                                onConfigChange={async (config) => {
                                                  console.log('Admin: Début de la sauvegarde du badge', config);
                                                  console.log('Admin: ID du certificat', associatedCert.id);
                                                  try {
                                                    // Sauvegarder immédiatement la configuration du badge
                                                    console.log('Admin: Tentative de mise à jour en base');
                                                    const { error, data } = await supabase
                                                      .from('certificate_templates')
                                                      .update({
                                                        badge_icon: config.badge_icon,
                                                        badge_color: config.badge_color,
                                                        badge_background_color: config.badge_background_color,
                                                        badge_size: config.badge_size,
                                                        custom_badge_url: config.custom_badge_url || null,
                                                        updated_at: new Date().toISOString()
                                                      })
                                                      .eq('id', associatedCert.id);

                                                    console.log('Admin: Résultat de la mise à jour', { error, data });

                                                    if (error) throw error;

                                                    console.log('Admin: Sauvegarde réussie');
                                                    toast({
                                                      title: "Configuration sauvegardée",
                                                      description: "Le badge a été mis à jour avec succès.",
                                                    });

                                                    // Recharger les certificats pour mettre à jour l'affichage
                                                    loadCertificates();
                                                  } catch (error) {
                                                    console.error('Admin: Erreur lors de la sauvegarde du badge:', error);
                                                    toast({
                                                      title: "Erreur",
                                                      description: "Impossible de sauvegarder la configuration du badge.",
                                                      variant: "destructive",
                                                    });
                                                  }
                                                }}
                                                levelNumber={level.level_number}
                                              />
                                             </div>

                                             {/* Configuration des descriptions de fonctionnalités */}
                                             <div className="space-y-4 border-t pt-4">
                                               <h4 className="font-medium text-sm">Descriptions de fonctionnalités (affichées sur la page d'accueil)</h4>
                                               <div className="space-y-3">
                                                 <div className="space-y-2">
                                                   <Label>Fonctionnalité 1</Label>
                                                   <Input 
                                                     placeholder="Ex: 3 sessions d'essai"
                                                     value={associatedCert.feature_1_text || ''}
                                                     onChange={(e) => {
                                                       setCertificates(prev => prev.map(cert => 
                                                         cert.id === associatedCert.id 
                                                           ? { ...cert, feature_1_text: e.target.value }
                                                           : cert
                                                       ));
                                                     }}
                                                   />
                                                 </div>
                                                 <div className="space-y-2">
                                                   <Label>Fonctionnalité 2</Label>
                                                   <Input 
                                                     placeholder="Ex: Accès complet après achat"
                                                     value={associatedCert.feature_2_text || ''}
                                                     onChange={(e) => {
                                                       setCertificates(prev => prev.map(cert => 
                                                         cert.id === associatedCert.id 
                                                           ? { ...cert, feature_2_text: e.target.value }
                                                           : cert
                                                       ));
                                                     }}
                                                   />
                                                 </div>
                                                 <div className="space-y-2">
                                                   <Label>Fonctionnalité 3</Label>
                                                   <Input 
                                                     placeholder="Ex: Certification officielle"
                                                     value={associatedCert.feature_3_text || ''}
                                                     onChange={(e) => {
                                                       setCertificates(prev => prev.map(cert => 
                                                         cert.id === associatedCert.id 
                                                           ? { ...cert, feature_3_text: e.target.value }
                                                           : cert
                                                       ));
                                                     }}
                                                   />
                                                 </div>
                                               </div>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    <DialogFooter className="gap-2">
                                      <Button variant="destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Supprimer
                                      </Button>
                                      <Button 
                                        onClick={async () => {
                                          if (!associatedCert) return;
                                          
                                          try {
                                            // Sauvegarder toutes les modifications du certificat
                                            const certToUpdate = certificates.find(cert => cert.id === associatedCert.id);
                                            if (!certToUpdate) return;

                                             const { error } = await supabase
                                               .from('certificate_templates')
                                               .update({
                                                 name: certToUpdate.name,
                                                 price_euros: certToUpdate.price_euros,
                                                 min_score_required: certToUpdate.min_score_required,
                                                 free_sessions: certToUpdate.free_sessions,
                                                 description: certToUpdate.description,
                                                 certificate_title: certToUpdate.certificate_title,
                                                 certificate_subtitle: certToUpdate.certificate_subtitle,
                                                 certificate_text: certToUpdate.certificate_text,
                                                 feature_1_text: certToUpdate.feature_1_text,
                                                 feature_2_text: certToUpdate.feature_2_text,
                                                 feature_3_text: certToUpdate.feature_3_text,
                                                 is_active: certToUpdate.is_active,
                                                 updated_at: new Date().toISOString()
                                               })
                                              .eq('id', associatedCert.id);

                                            if (error) throw error;

                                             toast({
                                               title: "Configuration sauvegardée",
                                               description: "Le certificat a été mis à jour avec succès.",
                                             });

                                             // Recharger les certificats
                                             await loadCertificates();
                                          } catch (error) {
                                            console.error('Erreur lors de la sauvegarde:', error);
                                            toast({
                                              title: "Erreur",
                                              description: "Impossible de sauvegarder la configuration.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        <Save className="h-4 w-4 mr-2" />
                                        Sauvegarder
                                      </Button>
                                      <DialogClose asChild>
                                        <Button variant="outline">
                                          Fermer
                                        </Button>
                                      </DialogClose>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                            
                            {/* Informations de la certification associée */}
                            {associatedCert && (
                              <div className="mt-3 p-3 bg-muted/50 rounded border-l-4 border-l-primary/50">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-sm">Certification associée</h5>
                                  <Badge variant="outline">
                                    {associatedCert.price_euros > 0 ? `${associatedCert.price_euros}€` : 'Gratuit'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{associatedCert.name}</p>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <span className="font-medium">Score minimum:</span> {associatedCert.min_score_required}%
                                  </div>
                                  <div>
                                    <span className="font-medium">Sessions gratuites:</span> {associatedCert.free_sessions}
                                  </div>
                                  <div>
                                    <span className="font-medium">Status:</span> {associatedCert.is_active ? "Active" : "Inactive"}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">Aucun niveau de difficulté configuré</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Créer le premier niveau
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Créer le premier niveau</DialogTitle>
                            <DialogDescription>
                              Commencez par créer votre premier niveau de difficulté
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="first_level_name">Nom du niveau</Label>
                              <Input id="first_level_name" placeholder="Débutant" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="first_level_desc">Description</Label>
                              <Textarea id="first_level_desc" placeholder="Description du niveau débutant" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit">Créer</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration du partage LinkedIn */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Configuration du partage de certifications
                </CardTitle>
                <CardDescription>
                  Paramètres globaux pour le partage des certifications sur LinkedIn et autres plateformes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organisation émettrice */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Organisation émettrice</h4>
                    <div className="space-y-3">
                       <div className="space-y-2">
                         <Label htmlFor="issuing_organization">Nom de l'organisation</Label>
                         <Input
                           id="issuing_organization"
                           placeholder="Mon Organisation"
                           value={certConfig.issuing_organization}
                           onChange={(e) => setCertConfig({...certConfig, issuing_organization: e.target.value})}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="organization_url">URL de l'organisation</Label>
                         <Input
                           id="organization_url"
                           placeholder="https://mon-organisation.com"
                           value={certConfig.organization_url}
                           onChange={(e) => setCertConfig({...certConfig, organization_url: e.target.value})}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="organization_logo">Logo de l'organisation (URL)</Label>
                         <Input
                           id="organization_logo"
                           placeholder="https://mon-organisation.com/logo.png"
                           value={certConfig.organization_logo}
                           onChange={(e) => setCertConfig({...certConfig, organization_logo: e.target.value})}
                         />
                       </div>
                    </div>
                  </div>

                  {/* Paramètres de certification */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Paramètres de certification</h4>
                    <div className="space-y-3">
                       <div className="space-y-2">
                         <Label htmlFor="expiration_months">Durée de validité (mois)</Label>
                          <Input
                            id="expiration_months"
                            type="number"
                            min="0"
                            placeholder="24"
                            value={certConfig.expiration_months}
                            onChange={(e) => setCertConfig({...certConfig, expiration_months: Math.max(0, parseInt(e.target.value) || 24)})}
                          />
                         <p className="text-xs text-muted-foreground">
                           Durée avant expiration de la certification (0 = pas d'expiration)
                         </p>
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="verification_url_template">Modèle d'URL de vérification</Label>
                         <Input
                           id="verification_url_template"
                           placeholder="https://mon-site.com/verify/{{credential_id}}"
                           value={certConfig.verification_url_template}
                           onChange={(e) => setCertConfig({...certConfig, verification_url_template: e.target.value})}
                         />
                         <p className="text-xs text-muted-foreground">
                           Utilisez {"{{credential_id}}"} comme placeholder pour l'ID unique
                         </p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Métadonnées JSON-LD */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-sm mb-4">Métadonnées JSON-LD (1EdTech)</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="context_url">URL du contexte</Label>
                       <Input
                         id="context_url"
                         value={certConfig.context_url}
                         onChange={(e) => setCertConfig({...certConfig, context_url: e.target.value})}
                         placeholder="https://www.w3.org/2018/credentials/v1"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="credential_type">Type de certification</Label>
                       <Input
                         id="credential_type"
                         value={certConfig.credential_type}
                         onChange={(e) => setCertConfig({...certConfig, credential_type: e.target.value})}
                         placeholder="VerifiableCredential"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="achievement_type">Type d'accomplissement</Label>
                       <Input
                         id="achievement_type"
                         value={certConfig.achievement_type}
                         onChange={(e) => setCertConfig({...certConfig, achievement_type: e.target.value})}
                         placeholder="Achievement"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="criteria_narrative">Description des critères</Label>
                       <Input
                         id="criteria_narrative"
                         placeholder="A réussi l'évaluation avec un score minimum de {{min_score}}%"
                         value={certConfig.criteria_narrative}
                         onChange={(e) => setCertConfig({...certConfig, criteria_narrative: e.target.value})}
                       />
                     </div>
                  </div>
                </div>

                 {/* Bouton de sauvegarde */}
                 <div className="flex justify-end pt-4 border-t">
                   <Button 
                     className="flex items-center gap-2" 
                     onClick={saveCertConfig}
                     disabled={savingCertConfig}
                   >
                     <Save className="h-4 w-4" />
                     {savingCertConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                   </Button>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

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

            <QuestionsManager difficultyLevels={difficultyLevels} />
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
