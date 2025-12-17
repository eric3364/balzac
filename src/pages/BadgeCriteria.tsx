import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Award, CheckCircle, Clock, BarChart } from 'lucide-react';

interface CriteriaData {
  level: number;
  levelName: string;
  minScore: number;
  totalQuestions: number;
  timeLimit?: number;
  skills: string[];
  description: string;
}

const BadgeCriteria = () => {
  const { level } = useParams<{ level: string }>();
  const [criteria, setCriteria] = useState<CriteriaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCriteria = async () => {
      if (!level) {
        setError('Niveau manquant');
        setLoading(false);
        return;
      }

      try {
        const [difficultyResult, templateResult, questionsResult] = await Promise.all([
          supabase
            .from('difficulty_levels')
            .select('*')
            .eq('level_number', parseInt(level))
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('certificate_templates')
            .select('*')
            .eq('difficulty_level_id', 
              '(SELECT id FROM difficulty_levels WHERE level_number = ' + level + ')'
            )
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('questions')
            .select('count')
            .eq('level', level)
        ]);

        if (!difficultyResult.data) {
          setError('Niveau non trouvé');
          setLoading(false);
          return;
        }

        const difficultyLevel = difficultyResult.data;
        const template = templateResult.data;
        const questionCount = questionsResult.count || 0;

        setCriteria({
          level: difficultyLevel.level_number,
          levelName: difficultyLevel.name,
          minScore: template?.min_score_required || 70,
          totalQuestions: questionCount,
          timeLimit: template?.time_limit_seconds ? template.time_limit_seconds / 60 : undefined,
          skills: [], // TODO: Ajouter les compétences depuis la base de données
          description: difficultyLevel.description || template?.description || 
            `Certification de niveau ${difficultyLevel.name} qui valide vos compétences.`
        });
      } catch (error) {
        console.error('Erreur lors du chargement des critères:', error);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [level]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des critères...</p>
        </div>
      </div>
    );
  }

  if (error || !criteria) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Critères non trouvés</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Target className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Critères d'obtention - {criteria.levelName}
            </h1>
            <p className="text-muted-foreground">
              Exigences pour obtenir cette certification
            </p>
          </div>

          {/* Description */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Description de la certification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{criteria.description}</p>
            </CardContent>
          </Card>

          {/* Critères techniques */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Exigences techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <BarChart className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Score minimum requis</p>
                    <Badge variant="secondary">{criteria.minScore}%</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Questions disponibles</p>
                    <p className="text-muted-foreground">{criteria.totalQuestions} questions</p>
                  </div>
                </div>
              </div>

              {criteria.timeLimit && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Temps limite par session</p>
                    <p className="text-muted-foreground">{criteria.timeLimit} minutes</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processus d'évaluation */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Processus d'évaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Inscription et préparation</p>
                  <p className="text-sm text-muted-foreground">
                    Accédez au contenu d'apprentissage et préparez-vous pour l'évaluation
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Sessions d'évaluation</p>
                  <p className="text-sm text-muted-foreground">
                    Complétez les sessions d'évaluation avec un score minimum de {criteria.minScore}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Validation et certification</p>
                  <p className="text-sm text-muted-foreground">
                    Recevez votre certification numérique conforme au standard Open Badge
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validité */}
          <Card>
            <CardHeader>
              <CardTitle>Validité de la certification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  • Cette certification est valide pendant 2 ans à partir de la date d'obtention
                </p>
                <p className="text-muted-foreground">
                  • Le badge numérique est vérifiable via la blockchain et les métadonnées Open Badge
                </p>
                <p className="text-muted-foreground">
                  • Compatible avec LinkedIn Learning et autres plateformes professionnelles
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BadgeCriteria;