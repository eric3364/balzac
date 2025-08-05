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

interface CertificateTemplate {
  id: string;
  difficulty_level_id: string;
  name: string;
  description: string | null;
  min_score_required: number;
  min_questions_correct: number | null;
  time_limit_seconds: number | null;
  certificate_title: string;
  certificate_subtitle: string | null;
  certificate_text: string;
  certificate_background_color: string;
  certificate_border_color: string;
  certificate_text_color: string;
  badge_icon: string;
  badge_color: string;
  badge_background_color: string;
  badge_size: string;
  custom_badge_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  difficulty_levels?: DifficultyLevel;
}

interface Question {
  id: number;
  content: string;
  type: 'QCM' | 'GAP_FILL' | 'ERROR_SPOT';
  level: number;
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

  // État pour la gestion des certificats
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplate[]>([]);
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<CertificateTemplate | null>(null);
  const [certificateForm, setCertificateForm] = useState({
    difficulty_level_id: '',
    name: '',
    description: '',
    min_score_required: 70,
    min_questions_correct: null as number | null,
    time_limit_seconds: null as number | null,
    certificate_title: 'Certificat de Réussite',
    certificate_subtitle: '',
    certificate_text: '',
    certificate_background_color: '#ffffff',
    certificate_border_color: '#6366f1',
    certificate_text_color: '#000000',
    badge_icon: 'award',
    badge_color: '#6366f1',
    badge_background_color: '#ffffff',
    badge_size: 'medium',
    custom_badge_url: null as string | null,
    is_active: true
  });

  // État pour la gestion des questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    content: '',
    type: 'QCM' as 'QCM' | 'GAP_FILL' | 'ERROR_SPOT',
    level: 1,
    rule: '',
    answer: '',
    choices: ['', '', ''],
    explanation: ''
  });
  const [questionStats, setQuestionStats] = useState<Record<number, number>>({});

  // État pour la configuration de la page d'accueil
  const [homepageConfig, setHomepageConfig] = useState({
    site_title: 'Balzac Certification',
    site_subtitle: 'Excellence en français',
    hero_title: 'Maîtrisez le français avec excellence',
    hero_description: 'Une plateforme de certification complète pour valider et perfectionner vos compétences en langue française',
    hero_cta_primary: 'Commencer gratuitement',
    hero_cta_secondary: 'Découvrir nos programmes',
    features_title: 'Pourquoi choisir Balzac Certification ?',
    features_description: 'Une approche moderne et rigoureuse pour certifier vos compétences linguistiques',
    stat1_number: '10K+',
    stat1_label: 'Apprenants certifiés',
    stat2_number: '95%',
    stat2_label: 'Taux de satisfaction',
    stat3_number: '15+',
    stat3_label: 'Niveaux disponibles',
    cta_title: 'Prêt à certifier vos compétences ?',
    cta_description: 'Rejoignez des milliers d\'apprenants qui ont déjà validé leur maîtrise du français',
    cta_button: 'Commencer maintenant'
  });
  const [savingHomepageConfig, setSavingHomepageConfig] = useState(false);

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
      loadAdministrators();
      loadUserStats();
      loadDifficultyLevels();
      loadCertificateTemplates();
      loadQuestions();
      loadTestConfig();
      loadHomepageConfig();
    } catch (error) {
      console.error('Erreur lors de la vérification admin:', error);
      navigate('/dashboard');
    }
  };

  const loadAdministrators = async () => {
    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdministrators(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      setLoadingData(true);

      // Récupération des statistiques depuis la base de données
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      const { data: users, error: usersError } = await supabase
        .from('users')
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

      if (usersError || sessionsError || questionsError || certificationsError) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      setUserStats({
        total_users: users?.length || 0,
        total_auth_users: authUsers?.users?.length || 0,
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

  // Fonctions pour gérer les certificats
  const loadCertificateTemplates = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('certificate_templates')
        .select(`
          *,
          difficulty_levels (
            id,
            level_number,
            name,
            color
          )
        `)
        .order('difficulty_levels.level_number', { ascending: true });

      if (error) throw error;
      setCertificateTemplates(templates as any || []);
    } catch (error) {
      console.error('Erreur lors du chargement des certificats:', error);
    }
  };

  const loadHomepageConfig = async () => {
    try {
      const { data: configs, error } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'site_title', 'site_subtitle', 'hero_title', 'hero_description',
          'hero_cta_primary', 'hero_cta_secondary', 'features_title', 'features_description',
          'stat1_number', 'stat1_label', 'stat2_number', 'stat2_label',
          'stat3_number', 'stat3_label', 'cta_title', 'cta_description', 'cta_button'
        ]);

      if (error) throw error;

      if (configs && configs.length > 0) {
        const configObj = configs.reduce((acc, config) => {
          acc[config.config_key] = config.config_value;
          return acc;
        }, {} as any);

        setHomepageConfig(prev => ({
          ...prev,
          ...configObj
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration de la page d\'accueil:', error);
    }
  };

  const saveHomepageConfig = async () => {
    setSavingHomepageConfig(true);
    try {
      const configEntries = Object.entries(homepageConfig).map(([key, value]) => ({
        config_key: key,
        config_value: value
      }));

      for (const entry of configEntries) {
        const { error } = await supabase
          .from('site_configuration')
          .upsert({
            ...entry,
            updated_by: user?.id
          }, {
            onConflict: 'config_key'
          });

        if (error) throw error;
      }

      toast({
        title: "Configuration sauvegardée",
        description: "La configuration de la page d'accueil a été mise à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    } finally {
      setSavingHomepageConfig(false);
    }
  };

  // Fonctions pour gérer les questions
  const loadQuestions = async () => {
    try {
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setQuestions((questionsData || []) as Question[]);

      // Calculer les statistiques par niveau
      const stats: Record<number, number> = {};
      questionsData?.forEach(q => {
        stats[q.level] = (stats[q.level] || 0) + 1;
      });
      setQuestionStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error);
    }
  };

  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        content: question.content,
        type: question.type,
        level: question.level,
        rule: question.rule || '',
        answer: question.answer,
        choices: question.choices || ['', '', ''],
        explanation: question.explanation || ''
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        content: '',
        type: 'QCM',
        level: 1,
        rule: '',
        answer: '',
        choices: ['', '', ''],
        explanation: ''
      });
    }
    setIsQuestionDialogOpen(true);
  };

  const saveQuestion = async () => {
    try {
      const questionData = {
        content: questionForm.content,
        type: questionForm.type,
        level: questionForm.level,
        rule: questionForm.rule || null,
        answer: questionForm.answer,
        choices: questionForm.type === 'QCM' ? questionForm.choices.filter(c => c.trim()) : null,
        explanation: questionForm.explanation || null
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        
        toast({
          title: "Question modifiée",
          description: "La question a été mise à jour avec succès"
        });
      } else {
        const { error } = await supabase
          .from('questions')
          .insert(questionData);

        if (error) throw error;
        
        toast({
          title: "Question créée",
          description: "La nouvelle question a été créée avec succès"
        });
      }

      setIsQuestionDialogOpen(false);
      await loadQuestions();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la question",
        variant: "destructive"
      });
    }
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Question supprimée",
        description: "La question a été supprimée avec succès"
      });
      
      await loadQuestions();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la question",
        variant: "destructive"
      });
    }
  };

  const exportQuestions = () => {
    const csvContent = [
      ['Type', 'Niveau', 'Contenu', 'Réponse', 'Choix 1', 'Choix 2', 'Choix 3', 'Règle', 'Explication'],
      ...questions.map(q => [
        q.type,
        q.level.toString(),
        q.content,
        q.answer,
        q.choices?.[0] || '',
        q.choices?.[1] || '',
        q.choices?.[2] || '',
        q.rule || '',
        q.explanation || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `questions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const templateContent = [
      ['Type', 'Niveau', 'Contenu', 'Réponse', 'Choix 1', 'Choix 2', 'Choix 3', 'Règle', 'Explication'],
      ['QCM', '1', 'Quelle est la capitale de la France ?', 'Paris', 'Paris', 'Londres', 'Berlin', '', 'Paris est la capitale de la France'],
      ['GAP_FILL', '1', 'La capitale de la France est _____.', 'Paris', '', '', '', '', ''],
      ['ERROR_SPOT', '1', 'Je vais au magasin pour acheter des painz.', 'pains', '', '', '', 'Accord du pluriel', 'Le mot "pain" au pluriel prend un "s"']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importQuestions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const rows = lines.slice(1).map(line => {
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          return matches?.map(field => field.replace(/^"|"$/g, '').trim()) || [];
        });

        const questionsToImport = rows.map(row => ({
          type: row[0] as 'QCM' | 'GAP_FILL' | 'ERROR_SPOT',
          level: parseInt(row[1]),
          content: row[2],
          answer: row[3],
          choices: row[0] === 'QCM' ? [row[4], row[5], row[6]].filter(c => c) : null,
          rule: row[7] || null,
          explanation: row[8] || null
        })).filter(q => q.content && q.answer);

        const { error } = await supabase.from('questions').insert(questionsToImport);
        if (error) throw error;

        toast({
          title: "Import réussi",
          description: `${questionsToImport.length} questions ont été importées avec succès`
        });
        
        await loadQuestions();
        event.target.value = '';
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        toast({
          title: "Erreur d'import",
          description: "Impossible d'importer les questions. Vérifiez le format du fichier.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const openCertificateDialog = (certificate?: CertificateTemplate, preselectedLevel?: DifficultyLevel) => {
    if (certificate) {
      setEditingCertificate(certificate);
      setCertificateForm({
        difficulty_level_id: certificate.difficulty_level_id,
        name: certificate.name,
        description: certificate.description || '',
        min_score_required: certificate.min_score_required,
        min_questions_correct: certificate.min_questions_correct,
        time_limit_seconds: certificate.time_limit_seconds,
        certificate_title: certificate.certificate_title,
        certificate_subtitle: certificate.certificate_subtitle || '',
        certificate_text: certificate.certificate_text,
        certificate_background_color: certificate.certificate_background_color,
        certificate_border_color: certificate.certificate_border_color,
        certificate_text_color: certificate.certificate_text_color,
        badge_icon: certificate.badge_icon || 'award',
        badge_color: certificate.badge_color || '#6366f1',
        badge_background_color: certificate.badge_background_color || '#ffffff',
        badge_size: certificate.badge_size || 'medium',
        custom_badge_url: certificate.custom_badge_url || null,
        is_active: certificate.is_active
      });
    } else {
      setEditingCertificate(null);
      setCertificateForm({
        difficulty_level_id: preselectedLevel?.id || '',
        name: preselectedLevel ? `Certificat ${preselectedLevel.name}` : '',
        description: preselectedLevel ? `Certificat pour le niveau ${preselectedLevel.name}` : '',
        min_score_required: 70,
        min_questions_correct: null,
        time_limit_seconds: null,
        certificate_title: 'Certificat de Réussite',
        certificate_subtitle: preselectedLevel ? `Niveau ${preselectedLevel.name}` : '',
        certificate_text: preselectedLevel 
          ? `Félicitations {student_name} !

Vous avez brillamment réussi le niveau ${preselectedLevel.name} avec un score de {score}%.

Ce certificat atteste de votre maîtrise des compétences du niveau ${preselectedLevel.name}.

Délivré le {date}.`
          : '',
        certificate_background_color: '#ffffff',
        certificate_border_color: preselectedLevel?.color || '#6366f1',
        certificate_text_color: '#000000',
        badge_icon: 'award',
        badge_color: preselectedLevel?.color || '#6366f1',
        badge_background_color: '#ffffff',
        badge_size: 'medium',
        custom_badge_url: null,
        is_active: true
      });
    }
    setIsCertificateDialogOpen(true);
  };

  const saveCertificateTemplate = async () => {
    try {
      if (editingCertificate) {
        // Modifier un certificat existant
        const { error } = await supabase
          .from('certificate_templates')
          .update({
            name: certificateForm.name,
            description: certificateForm.description || null,
            min_score_required: certificateForm.min_score_required,
            min_questions_correct: certificateForm.min_questions_correct,
            time_limit_seconds: certificateForm.time_limit_seconds,
            certificate_title: certificateForm.certificate_title,
            certificate_subtitle: certificateForm.certificate_subtitle || null,
            certificate_text: certificateForm.certificate_text,
            certificate_background_color: certificateForm.certificate_background_color,
            certificate_border_color: certificateForm.certificate_border_color,
            certificate_text_color: certificateForm.certificate_text_color,
            badge_icon: certificateForm.badge_icon,
            badge_color: certificateForm.badge_color,
            badge_background_color: certificateForm.badge_background_color,
            badge_size: certificateForm.badge_size,
            custom_badge_url: certificateForm.custom_badge_url,
            is_active: certificateForm.is_active
          })
          .eq('id', editingCertificate.id);

        if (error) throw error;
        
        toast({
          title: "Certificat modifié",
          description: "Le modèle de certificat a été mis à jour avec succès"
        });
      } else {
        // Créer un nouveau certificat
        const { error } = await supabase
          .from('certificate_templates')
          .insert({
            difficulty_level_id: certificateForm.difficulty_level_id,
            name: certificateForm.name,
            description: certificateForm.description || null,
            min_score_required: certificateForm.min_score_required,
            min_questions_correct: certificateForm.min_questions_correct,
            time_limit_seconds: certificateForm.time_limit_seconds,
            certificate_title: certificateForm.certificate_title,
            certificate_subtitle: certificateForm.certificate_subtitle || null,
            certificate_text: certificateForm.certificate_text,
            certificate_background_color: certificateForm.certificate_background_color,
            certificate_border_color: certificateForm.certificate_border_color,
            certificate_text_color: certificateForm.certificate_text_color,
            badge_icon: certificateForm.badge_icon,
            badge_color: certificateForm.badge_color,
            badge_background_color: certificateForm.badge_background_color,
            badge_size: certificateForm.badge_size,
            is_active: certificateForm.is_active,
            created_by: user?.id
          });

        if (error) throw error;
        
        toast({
          title: "Certificat créé",
          description: "Le nouveau modèle de certificat a été créé avec succès"
        });
      }

      setIsCertificateDialogOpen(false);
      await loadCertificateTemplates();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le modèle de certificat",
        variant: "destructive"
      });
    }
  };

  const deleteCertificateTemplate = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle de certificat ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Certificat supprimé",
        description: "Le modèle de certificat a été supprimé avec succès"
      });
      
      await loadCertificateTemplates();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle de certificat",
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
        {/* Onglets d'administration */}
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
                {loadingData ? (
                  <div className="text-center py-8">
                    <p>Chargement des statistiques...</p>
                  </div>
                ) : userStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userStats.total_auth_users}</div>
                      <p className="text-sm text-muted-foreground">Utilisateurs inscrits</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userStats.total_test_sessions}</div>
                      <p className="text-sm text-muted-foreground">Sessions de test</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userStats.total_certifications}</div>
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
                <CardTitle>Configuration de la page d'accueil</CardTitle>
                <CardDescription>
                  Paramétrez les visuels et textes affichés sur la page d'accueil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HomepageAssetUploader
                      label="Logo du site"
                      currentUrl={homepageAssets.logoUrl}
                      onUrlChange={(url) => updateHomepageAssets({ logoUrl: url })}
                      bucketPath="logo"
                    />
                    
                    <HomepageAssetUploader
                      label="Bandeau visuel (Hero Section)"
                      currentUrl={homepageAssets.bannerUrl}
                      onUrlChange={(url) => updateHomepageAssets({ bannerUrl: url })}
                      bucketPath="banner"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="banner_alt">Texte alternatif du bandeau</Label>
                    <Input
                      id="banner_alt"
                      value={homepageAssets.bannerAlt}
                      onChange={(e) => updateHomepageAssets({ bannerAlt: e.target.value })}
                      placeholder="Description du bandeau pour l'accessibilité"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="site_title">Titre du site</Label>
                    <Input
                      id="site_title"
                      value={homepageConfig.site_title}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, site_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_subtitle">Sous-titre du site</Label>
                    <Input
                      id="site_subtitle"
                      value={homepageConfig.site_subtitle}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, site_subtitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Titre principal (Hero)</Label>
                    <Input
                      id="hero_title"
                      value={homepageConfig.hero_title}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, hero_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_description">Description principale (Hero)</Label>
                    <Textarea
                      id="hero_description"
                      value={homepageConfig.hero_description}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, hero_description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hero_cta_primary">Texte bouton principal (Hero)</Label>
                      <Input
                        id="hero_cta_primary"
                        value={homepageConfig.hero_cta_primary}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, hero_cta_primary: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero_cta_secondary">Texte bouton secondaire (Hero)</Label>
                      <Input
                        id="hero_cta_secondary"
                        value={homepageConfig.hero_cta_secondary}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, hero_cta_secondary: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="features_title">Titre section avantages</Label>
                    <Input
                      id="features_title"
                      value={homepageConfig.features_title}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, features_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="features_description">Description section avantages</Label>
                    <Textarea
                      id="features_description"
                      value={homepageConfig.features_description}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, features_description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stat1_number">Statistique 1 - Nombre</Label>
                      <Input
                        id="stat1_number"
                        value={homepageConfig.stat1_number}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat1_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stat1_label">Statistique 1 - Label</Label>
                      <Input
                        id="stat1_label"
                        value={homepageConfig.stat1_label}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat1_label: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stat2_number">Statistique 2 - Nombre</Label>
                      <Input
                        id="stat2_number"
                        value={homepageConfig.stat2_number}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat2_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stat2_label">Statistique 2 - Label</Label>
                      <Input
                        id="stat2_label"
                        value={homepageConfig.stat2_label}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat2_label: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stat3_number">Statistique 3 - Nombre</Label>
                      <Input
                        id="stat3_number"
                        value={homepageConfig.stat3_number}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat3_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stat3_label">Statistique 3 - Label</Label>
                      <Input
                        id="stat3_label"
                        value={homepageConfig.stat3_label}
                        onChange={(e) => setHomepageConfig(prev => ({ ...prev, stat3_label: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta_title">Titre Call to Action</Label>
                    <Input
                      id="cta_title"
                      value={homepageConfig.cta_title}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, cta_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta_description">Description Call to Action</Label>
                    <Textarea
                      id="cta_description"
                      value={homepageConfig.cta_description}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, cta_description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta_button">Texte bouton Call to Action</Label>
                    <Input
                      id="cta_button"
                      value={homepageConfig.cta_button}
                      onChange={(e) => setHomepageConfig(prev => ({ ...prev, cta_button: e.target.value }))}
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={saveHomepageConfig} 
                      disabled={savingHomepageConfig}
                      className="w-full md:w-auto"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {savingHomepageConfig ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                    </Button>
                  </div>
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
                <div className="flex items-center justify-between mb-4">
                  <Button onClick={() => openLevelDialog()} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un niveau avec certificat
                  </Button>
                </div>
                <div className="grid gap-4">
                  {difficultyLevels.map((level) => {
                    // Trouver le certificat associé à ce niveau
                    const associatedCertificate = certificateTemplates.find(
                      (cert: any) => cert.difficulty_level_id === level.id
                    );
                    
                    return (
                      <div
                        key={level.id}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        {/* En-tête du niveau */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: level.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-lg">
                                  Niveau {level.level_number}: {level.name}
                                </span>
                                {!level.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    Inactif
                                  </Badge>
                                )}
                              </div>
                              {level.description && (
                                <p className="text-sm text-muted-foreground">
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
                              <Edit2 className="h-4 w-4 mr-2" />
                              Configurer
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

                        {/* Configuration du certificat associé */}
                        {associatedCertificate ? (
                          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Certificat associé
                              </h4>
                              <Button
                                onClick={() => openCertificateDialog(associatedCertificate)}
                                size="sm"
                                variant="ghost"
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Modifier le certificat
                              </Button>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Aperçu visuel (Rapport de visu) */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Aperçu du badge</Label>
                                <div className="flex items-center gap-3 p-3 bg-background rounded border">
                                  <BadgePreview
                                    icon={associatedCertificate.badge_icon || 'award'}
                                    color={associatedCertificate.badge_color || '#6366f1'}
                                    backgroundColor={associatedCertificate.badge_background_color || '#ffffff'}
                                    size="medium"
                                    customImageUrl={associatedCertificate.custom_badge_url}
                                  />
                                  <div className="text-xs">
                                    <p className="font-medium">{associatedCertificate.certificate_title}</p>
                                    {associatedCertificate.certificate_subtitle && (
                                      <p className="text-muted-foreground">{associatedCertificate.certificate_subtitle}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Description et modalités */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Modalités d'obtention</Label>
                                <div className="text-xs space-y-1 p-3 bg-background rounded border">
                                  <p><strong>Score minimum:</strong> {associatedCertificate.min_score_required}%</p>
                                  {associatedCertificate.min_questions_correct && (
                                    <p><strong>Questions correctes:</strong> {associatedCertificate.min_questions_correct}</p>
                                  )}
                                  {associatedCertificate.time_limit_seconds && (
                                    <p><strong>Temps limite:</strong> {Math.floor(associatedCertificate.time_limit_seconds / 60)} min</p>
                                  )}
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-muted-foreground">
                                      <strong>Description:</strong> {associatedCertificate.certificate_text.substring(0, 120)}...
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
                            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucun certificat configuré pour ce niveau</p>
                            <Button
                              onClick={() => {
                                // Pré-remplir le formulaire avec le niveau sélectionné
                                openCertificateDialog(undefined, level);
                              }}
                              size="sm"
                              variant="outline"
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Créer un certificat
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {difficultyLevels.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Aucun niveau de difficulté configuré</p>
                      <p className="text-sm mb-4">Créez votre premier niveau avec son certificat associé</p>
                      <Button onClick={() => openLevelDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer le premier niveau
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Gestion des Questions</h2>
                <p className="text-muted-foreground">
                  Créez et gérez les questions pour chaque niveau de difficulté
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadTemplate} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Modèle CSV
                </Button>
                <Button onClick={exportQuestions} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button
                  onClick={() => document.getElementById('import-csv')?.click()}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </Button>
                <input
                  id="import-csv"
                  type="file"
                  accept=".csv"
                  onChange={importQuestions}
                  style={{ display: 'none' }}
                />
                <Button onClick={() => openQuestionDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle question
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Questions par niveau</CardTitle>
                <CardDescription>
                  Répartition des questions selon les niveaux de difficulté
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {difficultyLevels.map(level => (
                    <div key={level.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge style={{ backgroundColor: level.color, color: 'white' }}>
                          Niveau {level.level_number}
                        </Badge>
                        <span className="text-2xl font-bold text-primary">
                          {questionStats[level.level_number] || 0}
                        </span>
                      </div>
                      <h3 className="font-medium">{level.name}</h3>
                      <p className="text-sm text-muted-foreground">questions disponibles</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {questions.length > 0 ? (
                    questions.map(question => (
                      <Card key={question.id} className="border-l-4" style={{ borderLeftColor: difficultyLevels.find(l => l.level_number === question.level)?.color || '#6366f1' }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">
                                  {question.type === 'QCM' ? 'QCM' : 
                                   question.type === 'GAP_FILL' ? 'Phrase à trous' : 
                                   'Correction d\'erreur'}
                                </Badge>
                                <Badge variant="outline">
                                  Niveau {question.level}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                  ID: {question.id}
                                </Badge>
                              </div>
                              <p className="font-medium mb-2">{question.content}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Réponse: <strong>{question.answer}</strong></span>
                                {question.type === 'QCM' && question.choices && (
                                  <span>Choix: {question.choices.join(', ')}</span>
                                )}
                                {question.rule && (
                                  <span>Règle: {question.rule}</span>
                                )}
                              </div>
                              {question.explanation && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <em>Explication: {question.explanation}</em>
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                onClick={() => openQuestionDialog(question)}
                                size="sm"
                                variant="outline"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => deleteQuestion(question.id)}
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Aucune question créée</p>
                      <p className="text-sm mb-4">Commencez par créer votre première question</p>
                      <Button onClick={() => openQuestionDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer la première question
                      </Button>
                    </div>
                  )}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog pour créer/modifier un niveau de difficulté */}
      <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Configurer le niveau et son certificat' : 'Créer un niveau avec certificat'}
            </DialogTitle>
            <DialogDescription>
              {editingLevel 
                ? 'Modifiez le niveau de difficulté. Le certificat associé peut être configuré séparément.'
                : 'Créez un nouveau niveau. Vous pourrez configurer son certificat ensuite.'
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
            
            {/* Information sur le certificat */}
            <div className="bg-muted/30 p-3 rounded-lg mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Configuration du certificat</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {editingLevel 
                  ? "Après modification, vous pourrez configurer le certificat associé depuis la liste des niveaux."
                  : "Après création du niveau, vous pourrez configurer son certificat associé avec l'aperçu visuel et les modalités d'obtention."
                }
              </p>
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

      {/* Dialog pour créer/modifier un certificat */}
      <Dialog open={isCertificateDialogOpen} onOpenChange={setIsCertificateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCertificate ? 'Modifier le certificat' : 'Créer un certificat'}
            </DialogTitle>
            <DialogDescription>
              {editingCertificate 
                ? 'Modifiez les critères et le modèle de certificat'
                : 'Créez un nouveau modèle de certificat pour un niveau de difficulté'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Informations générales */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Informations générales</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cert_difficulty_level">Niveau de difficulté</Label>
                  <Select 
                    value={certificateForm.difficulty_level_id} 
                    onValueChange={(value) => setCertificateForm({
                      ...certificateForm,
                      difficulty_level_id: value
                    })}
                    disabled={!!editingCertificate || !!certificateForm.difficulty_level_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          Niveau {level.level_number}: {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {certificateForm.difficulty_level_id && !editingCertificate && (
                    <p className="text-xs text-muted-foreground">
                      Niveau pré-sélectionné depuis la configuration du niveau
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cert_name">Nom du certificat</Label>
                  <Input
                    id="cert_name"
                    value={certificateForm.name}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      name: e.target.value
                    })}
                    placeholder="Ex: Certificat Débutant"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cert_description">Description</Label>
                <Input
                  id="cert_description"
                  value={certificateForm.description}
                  onChange={(e) => setCertificateForm({
                    ...certificateForm,
                    description: e.target.value
                  })}
                  placeholder="Description du certificat (optionnel)"
                />
              </div>
            </div>

            {/* Critères de validation */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Critères de validation</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_score">Score minimum (%)</Label>
                  <Input
                    id="min_score"
                    type="number"
                    min="0"
                    max="100"
                    value={certificateForm.min_score_required}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      min_score_required: parseInt(e.target.value) || 70
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_questions">Questions min. correctes</Label>
                  <Input
                    id="min_questions"
                    type="number"
                    min="0"
                    value={certificateForm.min_questions_correct || ''}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      min_questions_correct: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Optionnel"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time_limit">Temps limite (sec)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min="0"
                    value={certificateForm.time_limit_seconds || ''}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      time_limit_seconds: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </div>

            {/* Modèle de certificat */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Modèle de certificat</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cert_title">Titre</Label>
                  <Input
                    id="cert_title"
                    value={certificateForm.certificate_title}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      certificate_title: e.target.value
                    })}
                    placeholder="Certificat de Réussite"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cert_subtitle">Sous-titre</Label>
                  <Input
                    id="cert_subtitle"
                    value={certificateForm.certificate_subtitle}
                    onChange={(e) => setCertificateForm({
                      ...certificateForm,
                      certificate_subtitle: e.target.value
                    })}
                    placeholder="Niveau - Matière"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cert_text">Texte du certificat</Label>
                <Textarea
                  id="cert_text"
                  value={certificateForm.certificate_text}
                  onChange={(e) => setCertificateForm({
                    ...certificateForm,
                    certificate_text: e.target.value
                  })}
                  placeholder="Utilisez {student_name}, {score}, {date} comme variables"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles: {'{student_name}'}, {'{score}'}, {'{date}'}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bg_color">Couleur de fond</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={certificateForm.certificate_background_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_background_color: e.target.value
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={certificateForm.certificate_background_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_background_color: e.target.value
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="border_color">Couleur bordure</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={certificateForm.certificate_border_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_border_color: e.target.value
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={certificateForm.certificate_border_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_border_color: e.target.value
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="text_color">Couleur texte</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={certificateForm.certificate_text_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_text_color: e.target.value
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={certificateForm.certificate_text_color}
                      onChange={(e) => setCertificateForm({
                        ...certificateForm,
                        certificate_text_color: e.target.value
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Configuration du badge */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Badge de certification</h4>
                
                <BadgeSelector
                  selectedIcon={certificateForm.badge_icon}
                  onIconSelect={(icon) => setCertificateForm({
                    ...certificateForm,
                    badge_icon: icon
                  })}
                  selectedColor={certificateForm.badge_color}
                  onColorSelect={(color) => setCertificateForm({
                    ...certificateForm,
                    badge_color: color
                  })}
                  selectedBgColor={certificateForm.badge_background_color}
                  onBgColorSelect={(color) => setCertificateForm({
                    ...certificateForm,
                    badge_background_color: color
                  })}
                  customImageUrl={certificateForm.custom_badge_url || undefined}
                  onCustomImageUpload={async (file) => {
                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${Date.now()}.${fileExt}`;
                      const { data, error } = await supabase.storage
                        .from('custom-badges')
                        .upload(fileName, file);
                      
                      if (error) throw error;
                      
                      const { data: { publicUrl } } = supabase.storage
                        .from('custom-badges')
                        .getPublicUrl(fileName);
                      
                      setCertificateForm(prev => ({ 
                        ...prev, 
                        custom_badge_url: publicUrl,
                        badge_icon: 'custom'
                      }));
                      
                      toast({
                        title: "Badge importé",
                        description: "Le badge personnalisé a été importé avec succès.",
                      });
                    } catch (error) {
                      console.error('Erreur lors de l\'upload:', error);
                      toast({
                        title: "Erreur",
                        description: "Impossible d'importer le badge.",
                        variant: "destructive",
                      });
                    }
                  }}
                  onCustomImageRemove={() => {
                    setCertificateForm(prev => ({ 
                      ...prev, 
                      custom_badge_url: null,
                      badge_icon: 'award'
                    }));
                  }}
                />
              </div>
              
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cert_active">Certificat actif</Label>
                  <p className="text-xs text-muted-foreground">
                    Activer/désactiver ce modèle de certificat
                  </p>
                </div>
                <Switch
                  id="cert_active"
                  checked={certificateForm.is_active}
                  onCheckedChange={(checked) => setCertificateForm({
                    ...certificateForm,
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
              onClick={() => setIsCertificateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={saveCertificateTemplate}
              disabled={!certificateForm.name.trim() || !certificateForm.difficulty_level_id}
            >
              {editingCertificate ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de gestion des questions */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Modifier la question' : 'Créer une nouvelle question'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion ? 'Modifiez les informations de la question.' : 'Créez une nouvelle question pour enrichir votre base de données.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="question_type">Type de question</Label>
                <Select
                  value={questionForm.type}
                  onValueChange={(value: 'QCM' | 'GAP_FILL' | 'ERROR_SPOT') => setQuestionForm({
                    ...questionForm,
                    type: value,
                    choices: value === 'QCM' ? ['', '', ''] : ['', '', '']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QCM">QCM (Choix multiples)</SelectItem>
                    <SelectItem value="GAP_FILL">Phrase à trous</SelectItem>
                    <SelectItem value="ERROR_SPOT">Correction d'erreur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="question_level">Niveau</Label>
                <Select
                  value={questionForm.level.toString()}
                  onValueChange={(value) => setQuestionForm({
                    ...questionForm,
                    level: parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => (
                      <SelectItem key={level.id} value={level.level_number.toString()}>
                        Niveau {level.level_number} - {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="question_content">Contenu de la question</Label>
              <Textarea
                id="question_content"
                value={questionForm.content}
                onChange={(e) => setQuestionForm({
                  ...questionForm,
                  content: e.target.value
                })}
                placeholder={
                  questionForm.type === 'QCM' ? 'Ex: Quelle est la capitale de la France ?' :
                  questionForm.type === 'GAP_FILL' ? 'Ex: La capitale de la France est _____.' :
                  'Ex: Je vais au magasin pour acheter des painz.'
                }
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="question_answer">Réponse correcte</Label>
              <Input
                id="question_answer"
                value={questionForm.answer}
                onChange={(e) => setQuestionForm({
                  ...questionForm,
                  answer: e.target.value
                })}
                placeholder={
                  questionForm.type === 'QCM' ? 'Ex: Paris' :
                  questionForm.type === 'GAP_FILL' ? 'Ex: Paris' :
                  'Ex: pains'
                }
              />
            </div>
            
            {questionForm.type === 'QCM' && (
              <div className="space-y-2">
                <Label>Choix multiples (incluez la bonne réponse)</Label>
                <div className="space-y-2">
                  {questionForm.choices.map((choice, index) => (
                    <Input
                      key={index}
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...questionForm.choices];
                        newChoices[index] = e.target.value;
                        setQuestionForm({
                          ...questionForm,
                          choices: newChoices
                        });
                      }}
                      placeholder={`Choix ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {questionForm.type === 'ERROR_SPOT' && (
              <div className="space-y-2">
                <Label htmlFor="question_rule">Règle grammaticale</Label>
                <Input
                  id="question_rule"
                  value={questionForm.rule}
                  onChange={(e) => setQuestionForm({
                    ...questionForm,
                    rule: e.target.value
                  })}
                  placeholder="Ex: Accord du pluriel"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="question_explanation">Explication (optionnel)</Label>
              <Textarea
                id="question_explanation"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({
                  ...questionForm,
                  explanation: e.target.value
                })}
                placeholder="Explication détaillée de la réponse"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsQuestionDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={saveQuestion}
              disabled={!questionForm.content.trim() || !questionForm.answer.trim()}
            >
              {editingQuestion ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
