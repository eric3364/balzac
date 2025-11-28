import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInitialAssessment } from '@/hooks/useInitialAssessment';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { AssessmentQuestion } from '@/types/interfaces';
import { CheckCircle, Clock, BookOpen, Target, Shield } from 'lucide-react';
import { toast } from 'sonner';

const InitialAssessmentCard = () => {
  const { assessment, loading, hasCompleted, getAssessmentQuestions, saveAssessment } = useInitialAssessment();
  const [isStarting, setIsStarting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<{ questionId: number; answer: string; isCorrect: boolean; category: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Système anti-triche
  const { isTerminated } = useAntiCheat({
    onTestTerminated: () => {
      setIsActive(false);
      setShowResults(false);
      toast.error('Évaluation interrompue pour des raisons de sécurité');
    },
    isActive: isActive && !showResults,
    strictMode: true
  });

  const startAssessment = async () => {
    if (isTerminated) {
      toast.error('Impossible de démarrer l\'évaluation. Veuillez rafraîchir la page.');
      return;
    }
    
    setIsStarting(true);
    try {
      const assessmentQuestions = await getAssessmentQuestions();
      if (assessmentQuestions.length === 0) {
        toast.error('Aucune question disponible pour l\'évaluation');
        return;
      }
      setQuestions(assessmentQuestions);
      setCurrentQuestion(0);
      setAnswers([]);
      setIsActive(true); // Activer en dernier pour déclencher l'anti-triche
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'évaluation');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (isTerminated) {
      toast.error('Évaluation interrompue. Impossible de continuer.');
      return;
    }

    const question = questions[currentQuestion];
    const isCorrect = answer.toLowerCase().trim() === (question.answer || '').toLowerCase().trim();
    
    setAnswers(prev => [...prev, {
      questionId: question.id,
      answer,
      isCorrect,
      category: question.category
    }]);

    // Réinitialiser la réponse courante
    setCurrentAnswer('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      completeAssessment();
    }
  };

  const completeAssessment = async () => {
    // Calculer les scores par catégorie
    const conjugaisonAnswers = answers.filter(a => a.category === 'conjugaison');
    const grammaireAnswers = answers.filter(a => a.category === 'grammaire');
    const vocabulaireAnswers = answers.filter(a => a.category === 'vocabulaire');

    const conjugaisonScore = conjugaisonAnswers.length > 0 
      ? Math.round((conjugaisonAnswers.filter(a => a.isCorrect).length / conjugaisonAnswers.length) * 100)
      : 0;
    
    const grammaireScore = grammaireAnswers.length > 0
      ? Math.round((grammaireAnswers.filter(a => a.isCorrect).length / grammaireAnswers.length) * 100)
      : 0;
    
    const vocabulaireScore = vocabulaireAnswers.length > 0
      ? Math.round((vocabulaireAnswers.filter(a => a.isCorrect).length / vocabulaireAnswers.length) * 100)
      : 0;

    const overallScore = Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100);

    // Générer des recommandations
    const recommendations = generateRecommendations(conjugaisonScore, grammaireScore, vocabulaireScore);

    const scores = {
      conjugaison: conjugaisonScore,
      grammaire: grammaireScore,
      vocabulaire: vocabulaireScore,
      overall: overallScore
    };

    try {
      await saveAssessment(scores, recommendations);
      setShowResults(true);
      toast.success('Évaluation complétée avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde de l\'évaluation');
    }
  };

  const generateRecommendations = (
    conjugaison: number, 
    grammaire: number, 
    vocabulaire: number
  ): string[] => {
    const recommendations: string[] = [];

    if (conjugaison < 70) {
      recommendations.push('Concentrez-vous sur la conjugaison des verbes, notamment les temps du présent et les formes irrégulières.');
    }
    if (grammaire < 70) {
      recommendations.push('Travaillez la grammaire française, en particulier les accords et la syntaxe des phrases complexes.');
    }
    if (vocabulaire < 70) {
      recommendations.push('Enrichissez votre vocabulaire en étudiant les homophones et les expressions idiomatiques.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent niveau ! Continuez à pratiquer pour maintenir vos compétences.');
    }

    return recommendations;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasCompleted && assessment) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Évaluation initiale complétée</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Votre évaluation a été complétée le {new Date(assessment.completed_at).toLocaleDateString('fr-FR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{assessment.scores.conjugaison}%</div>
              <div className="text-sm text-muted-foreground">Conjugaison</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{assessment.scores.grammaire}%</div>
              <div className="text-sm text-muted-foreground">Grammaire</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{assessment.scores.vocabulaire}%</div>
              <div className="text-sm text-muted-foreground">Vocabulaire</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assessment.scores.overall}%</div>
              <div className="text-sm text-muted-foreground">Score global</div>
            </div>
          </div>

          {assessment.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-green-800">Recommandations :</h4>
              <ul className="space-y-1">
                {assessment.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                    <Target className="h-3 w-3 mt-1 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isTerminated) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800">Évaluation interrompue</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            L'évaluation a été interrompue pour des raisons de sécurité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              Vous avez quitté la page pendant l'évaluation. Pour des raisons de sécurité, 
              l'évaluation a été terminée. Veuillez rafraîchir la page pour recommencer.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full"
            variant="destructive"
          >
            Rafraîchir la page
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isActive) {
    if (showResults) {
      return (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Évaluation terminée !</CardTitle>
            <CardDescription>
              Vos résultats ont été sauvegardés. Vous pouvez maintenant commencer les tests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Voir mes résultats
            </Button>
          </CardContent>
        </Card>
      );
    }

    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Évaluation initiale</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Question {currentQuestion + 1} / {questions.length}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Réf: {question.id}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-orange-700">
              🔒 <strong>Session sécurisée :</strong> Ne quittez pas cette page pendant l'évaluation. 
              Tout changement d'onglet ou fermeture de page entraînera l'interruption définitive du test.
            </AlertDescription>
          </Alert>
          <div>
            {question.rule && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm text-muted-foreground font-medium">
                  <span className="font-semibold">Règle :</span> {question.rule}
                </p>
              </div>
            )}
            <h3 className="text-lg font-semibold mb-4">{question.content}</h3>
            
            {question.type === 'multiple_choice' && Array.isArray(question.choices) && question.choices.length > 0 ? (
              <div className="space-y-2">
                {(Array.isArray(question.choices) ? question.choices : []).map((choice, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 text-left"
                    onClick={() => handleAnswer(choice)}
                  >
                    {choice}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Votre réponse :</label>
                  {question.type === 'long_text' ? (
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Tapez votre réponse ici..."
                      className="min-h-[100px]"
                      spellCheck="false"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-gramm="false"
                      data-gramm_editor="false"
                      data-enable-grammarly="false"
                      lang="fr"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Tapez votre réponse ici..."
                      spellCheck="false"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-gramm="false"
                      data-gramm_editor="false"
                      data-enable-grammarly="false"
                      lang="fr"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && currentAnswer.trim()) {
                          handleAnswer(currentAnswer.trim());
                        }
                      }}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleAnswer(currentAnswer.trim())}
                    disabled={!currentAnswer.trim()}
                    className="flex-1"
                  >
                    Valider la réponse
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAnswer('')}
                  >
                    Passer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-800">Évaluation initiale requise</CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          Avant de commencer vos tests, réalisez cette évaluation de 40 questions (10 par niveau) pour identifier vos points forts et axes d'amélioration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-blue-700">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            ~15 minutes
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            40 questions
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Cette évaluation analyse :</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Conjugaison des verbes (10 questions)</li>
            <li>• Règles de grammaire (10 questions)</li>
            <li>• Vocabulaire et homophones (10 questions)</li>
            <li>• Niveau avancé (10 questions)</li>
          </ul>
        </div>

        <Button 
          onClick={startAssessment} 
          disabled={isStarting}
          className="w-full"
        >
          {isStarting ? 'Chargement...' : 'Commencer l\'évaluation'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default InitialAssessmentCard;