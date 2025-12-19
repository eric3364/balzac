import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAntiCheatConfig } from '@/hooks/useAntiCheatConfig';
import { useTestInstructions } from '@/hooks/useTestInstructions';
import { Save, TestTube, Shield, MessageSquare } from 'lucide-react';

interface Level {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface TestLevelConfig {
  level_id: string;
  level_number: number;
  level_name: string;
  questions_percentage: number;
  total_questions: number;
  estimated_tests: number;
}

export const TestSettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [testConfigs, setTestConfigs] = useState<TestLevelConfig[]>([]);
  const { isEnabled: antiCheatEnabled, loading: antiCheatLoading, updateConfig: updateAntiCheatConfig } = useAntiCheatConfig();
  const { instructions, loading: instructionsLoading, updateInstructions } = useTestInstructions();
  const [tempInstructions, setTempInstructions] = useState<string>('');

  const loadLevels = async () => {
    try {
      const { data: levelsData, error: levelsError } = await supabase
        .from('difficulty_levels')
        .select('id, level_number, name, description, is_active')
        .eq('is_active', true)
        .order('level_number', { ascending: true });

      if (levelsError) throw levelsError;
      setLevels(levelsData || []);

      // Charger les questions pour chaque niveau
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('level');

      if (questionsError) throw questionsError;

      // Mapping des noms de niveau vers les numéros
      const levelNameToNumber: Record<string, number> = {
        'élémentaire': 1,
        'elementaire': 1,
        'intermédiaire': 2,
        'intermediaire': 2,
        'avancé': 3,
        'avance': 3
      };

      // Compter les questions par niveau (en utilisant le mapping textuel)
      const questionCounts: Record<number, number> = {};
      (questionsData || []).forEach((q: any) => {
        const levelText = (q.level || '').toLowerCase().trim();
        const levelNumber = levelNameToNumber[levelText] || 0;
        if (levelNumber > 0) {
          questionCounts[levelNumber] = (questionCounts[levelNumber] || 0) + 1;
        }
      });

      // Charger la configuration existante
      const configKeys = (levelsData || []).map(level => `test_questions_percentage_level_${level.level_number}`);
      const { data: configData, error: configError } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', configKeys);

      if (configError) throw configError;

      // Créer la configuration pour chaque niveau
      const configs: TestLevelConfig[] = (levelsData || []).map(level => {
        const configKey = `test_questions_percentage_level_${level.level_number}`;
        const existingConfig = (configData || []).find(c => c.config_key === configKey);
        const percentage = existingConfig ? Number(existingConfig.config_value) : 20;
        const totalQuestions = questionCounts[level.level_number] || 0;
        const questionsPerTest = Math.ceil((totalQuestions * percentage) / 100);
        const estimatedTests = questionsPerTest > 0 ? Math.ceil(totalQuestions / questionsPerTest) : 0;

        return {
          level_id: level.id,
          level_number: level.level_number,
          level_name: level.name,
          questions_percentage: percentage,
          total_questions: totalQuestions,
          estimated_tests: estimatedTests
        };
      });

      setTestConfigs(configs);
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les niveaux.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePercentage = (levelNumber: number, percentage: number) => {
    setTestConfigs(prev => prev.map(config => {
      if (config.level_number === levelNumber) {
        const questionsPerTest = Math.ceil((config.total_questions * percentage) / 100);
        const estimatedTests = questionsPerTest > 0 ? Math.ceil(config.total_questions / questionsPerTest) : 0;
        
        return {
          ...config,
          questions_percentage: percentage,
          estimated_tests: estimatedTests
        };
      }
      return config;
    }));
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const user = await supabase.auth.getUser();
      const configEntries = testConfigs.map(config => ({
        config_key: `test_questions_percentage_level_${config.level_number}`,
        config_value: config.questions_percentage,
        updated_by: user.data.user?.id || null
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
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAntiCheatToggle = async (enabled: boolean) => {
    const success = await updateAntiCheatConfig(enabled);
    if (success) {
      toast({
        title: "Configuration mise à jour",
        description: `Système anti-triche ${enabled ? 'activé' : 'désactivé'} avec succès.`,
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration anti-triche.",
        variant: "destructive",
      });
    }
  };

  const handleInstructionsChange = async () => {
    if (tempInstructions.trim() === '') {
      toast({
        title: "Erreur",
        description: "Le message d'instructions ne peut pas être vide.",
        variant: "destructive",
      });
      return;
    }

    const success = await updateInstructions(tempInstructions);
    if (success) {
      toast({
        title: "Succès",
        description: "Votre modification a été enregistrée",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le message d'instructions.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadLevels();
  }, []);

  // Initialiser tempInstructions avec les instructions chargées
  useEffect(() => {
    if (instructions && !instructionsLoading) {
      setTempInstructions(instructions);
    }
  }, [instructions, instructionsLoading]);

  if (loading || antiCheatLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Anti-triche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Système anti-triche
          </CardTitle>
          <CardDescription>
            Contrôlez l'activation du système anti-triche qui empêche les apprenants de quitter la fenêtre pendant les tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="anti-cheat-toggle" className="text-base font-medium">
                Activer le système anti-triche
              </Label>
              <p className="text-sm text-muted-foreground">
                Empêche les apprenants de changer de fenêtre, d'utiliser certains raccourcis clavier, 
                et surveille les tentatives de triche pendant les tests.
              </p>
            </div>
            <Switch
              id="anti-cheat-toggle"
              checked={antiCheatEnabled}
              onCheckedChange={handleAntiCheatToggle}
            />
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Fonctionnalités du système anti-triche :</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Détection du changement de fenêtre ou d'onglet</li>
              <li>Blocage des raccourcis clavier (F12, Ctrl+Shift+I, etc.)</li>
              <li>Désactivation du clic droit</li>
              <li>Prévention de la navigation avec les boutons du navigateur</li>
              <li>Avertissements et interruption automatique après plusieurs tentatives</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configuration du message d'instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message d'instructions pour les tests
          </CardTitle>
          <CardDescription>
            Personnalisez le message d'avertissement qui s'affiche au début de chaque test pour donner des instructions aux apprenants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions-message">
              Message d'instructions
            </Label>
            <Textarea
              id="instructions-message"
              placeholder="Entrez le message d'instructions qui sera affiché dans les tests..."
              value={tempInstructions}
              onChange={(e) => setTempInstructions(e.target.value)}
              rows={4}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Ce message apparaîtra dans un encadré d'avertissement au début de chaque test pour informer les apprenants des règles de réponse.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleInstructionsChange} 
              disabled={instructionsLoading || tempInstructions.trim() === ''}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder le message
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Paramètres des sessions par niveau
          </CardTitle>
          <CardDescription>
            Configurez le pourcentage de questions utilisées pour chaque session par niveau. 
            Ce pourcentage détermine combien de questions seront sélectionnées de la base de données pour créer chaque session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {testConfigs.map((config) => (
              <div key={config.level_id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Niveau {config.level_number}: {config.level_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {config.total_questions} questions disponibles
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{config.estimated_tests} sessions estimées</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.ceil((config.total_questions * config.questions_percentage) / 100)} questions par session
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`percentage-${config.level_number}`}>
                      Pourcentage de questions par session (%)
                    </Label>
                    <Input
                      id={`percentage-${config.level_number}`}
                      type="number"
                      min="1"
                      max="100"
                      value={config.questions_percentage}
                      onChange={(e) => updatePercentage(config.level_number, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• Questions par session: {Math.ceil((config.total_questions * config.questions_percentage) / 100)}</p>
                    <p>• Nombre de sessions possibles: {config.estimated_tests}</p>
                    <p>• Total questions utilisées: {Math.min(config.total_questions, Math.ceil((config.total_questions * config.questions_percentage) / 100) * config.estimated_tests)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={saveConfiguration} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comment ça fonctionne ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Pourcentage de questions :</strong> Détermine combien de questions sont sélectionnées 
            de la base de données pour créer chaque session. Par exemple, avec 100 questions et 20%, 
            chaque session contiendra 20 questions.
          </p>
          <p>
            <strong>Nombre de sessions estimées :</strong> Indique combien de sessions différentes peuvent être 
            générées avec ce pourcentage. Plus le pourcentage est élevé, moins il y aura de sessions différentes possibles.
          </p>
          <p>
            <strong>Recommandation :</strong> Un pourcentage entre 15% et 25% offre un bon équilibre 
            entre la diversité des sessions et la couverture du contenu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};