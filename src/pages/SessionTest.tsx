import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionProgress } from '@/hooks/useSessionProgress';
import { useUserStats } from '@/hooks/useUserStats';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useTestInstructions } from '@/hooks/useTestInstructions';
import { getLevelName } from '@/lib/levelMapping';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Trophy, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: number;
  content: string;
  choices: string[] | null;
  type: string;
  level: string;
  rule?: string;
  explanation?: string;
  answer?: string;
}

interface SessionAnswer {
  question_id: number;
  user_answer: string;
  is_correct: boolean;
}

const SessionTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Paramètres de session depuis l'URL
  const sessionLevel = parseInt(searchParams.get('level') || '1');
  const sessionNumber = parseInt(searchParams.get('session') || '1'); // Numérotation simplifiée : entiers
  const sessionType = (searchParams.get('type') || 'regular') as 'regular' | 'remedial';
  
  const { progress, updateProgress, recordFailedQuestion } = useSessionProgress(sessionLevel);
  const { refetchStats } = useUserStats();
  const { instructions } = useTestInstructions();

  // États du test
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<SessionAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    passed: boolean;
    levelCompleted?: boolean;
    certification?: any;
  } | null>(null);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const completionRef = useRef(false);
  const sessionStartTime = useRef<string | null>(null);

  // Anti-cheat system
  const handleTestTerminated = () => {
    setTestCompleted(true);
    toast({
      title: "Test interrompu",
      description: "Le test a été interrompu pour cause de triche détectée.",
      variant: "destructive"
    });
    navigate('/dashboard');
  };

  const { attempts, isTerminated, isLocked, warningMessage } = useAntiCheat({
    onTestTerminated: handleTestTerminated,
    isActive: !testCompleted && !isLoading && questions.length > 0,
    strictMode: true // Mode verrouillage complet
  });

  // Charger les questions de la session
  const loadSessionQuestions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('Loading session questions for:', { sessionLevel, sessionNumber, sessionType });

      // Récupérer le pourcentage de questions configuré
      const { data: configData } = await supabase
        .from('site_configuration')
        .select('config_value')
        .eq('config_key', 'questions_percentage_per_level')
        .single();

      const questionsPercentage = parseInt(configData?.config_value as string) || 20;

      // Appeler l'edge function sécurisée pour récupérer les questions
      const { data: sessionQuestions, error } = await supabase.functions.invoke('get-session-questions', {
        body: {
          level: sessionLevel,
          session_number: sessionNumber,
          session_type: sessionType,
          questions_percentage: questionsPercentage
        }
      });

      console.log('Session questions from edge function:', sessionQuestions, 'Error:', error);

      if (error) throw error;

      // Sécuriser les données - gérer tous les formats possibles
      const safeQuestions = Array.isArray(sessionQuestions) 
        ? sessionQuestions 
        : Array.isArray(sessionQuestions?.questions) 
          ? sessionQuestions.questions 
          : Array.isArray(sessionQuestions?.data) 
            ? sessionQuestions.data 
            : [];

      if (safeQuestions.length === 0) {
        toast({
          title: "Aucune question",
          description: sessionType === 'remedial' 
            ? "Vous n'avez aucune question échouée à revoir pour ce niveau."
            : "Aucune question disponible pour cette session.",
          variant: sessionType === 'remedial' ? 'default' : 'destructive'
        });
        navigate('/dashboard');
        return;
      }

      setQuestions(safeQuestions.map((q: any) => ({
        id: q.id,
        content: q.content || '',
        type: q.type || 'multiple_choice',
        level: q.level || '',
        rule: q.rule || '',
        explanation: q.explanation || '',
        choices: Array.isArray(q.choices) ? q.choices : (q.choices ? [q.choices] : [])
      })));
      
      // Enregistrer le temps de début de la session
      if (!sessionStartTime.current) {
        sessionStartTime.current = new Date().toISOString();
        console.log('Session started at:', sessionStartTime.current);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les questions de la session: ${(error as any)?.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionLevel, sessionNumber, navigate]);

  // Enregistrer la réponse actuelle
  const submitAnswer = useCallback(async () => {
    if (!currentAnswer.trim()) {
      toast({
        title: "Réponse requise",
        description: "Veuillez sélectionner ou saisir une réponse.",
        variant: "destructive"
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];

    try {
      // Valider la réponse via l'edge function sécurisée
      const { data: validationResult, error } = await supabase.functions.invoke('validate-answer', {
        body: {
          question_id: currentQuestion.id,
          user_answer: currentAnswer
        }
      });

      if (error) throw error;

      const isCorrect = validationResult.is_correct;

      const answer: SessionAnswer = {
        question_id: currentQuestion.id,
        user_answer: currentAnswer,
        is_correct: isCorrect
      };

      setUserAnswers(prev => [...prev, answer]);

      // Enregistrer les questions échouées
      if (!isCorrect) {
        recordFailedQuestion(currentQuestion.id);
      }

      // Si correct, passer directement à la question suivante
      // Si incorrect, afficher l'explication
      if (isCorrect) {
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentAnswer('');
            setShowExplanation(false);
          } else {
            setTestCompleted(true);
          }
        }, 500);
      } else {
        // Afficher l'explication retournée par le serveur
        setShowExplanation(true);
        // Mettre à jour la question avec l'explication serveur si nécessaire
        if (validationResult.explanation) {
          setQuestions(prev => prev.map((q, idx) => 
            idx === currentQuestionIndex 
              ? { ...q, explanation: validationResult.explanation, rule: validationResult.rule }
              : q
          ));
        }
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider votre réponse. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  }, [currentAnswer, questions, currentQuestionIndex, recordFailedQuestion]);

  // Passer à la question suivante
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
      setShowExplanation(false);
    } else {
      setTestCompleted(true);
    }
  }, [currentQuestionIndex, questions.length]);

  // Terminer la session
  const completeSession = useCallback(async () => {
    if (!user || completionRef.current) return;
    
    completionRef.current = true;
    setIsCompletingSession(true);

    console.log('=== DÉBUT COMPLETION SESSION ===');
    console.log('User:', user?.id);
    console.log('Session params:', { sessionLevel, sessionNumber, sessionType });
    console.log('User answers:', userAnswers);
    console.log('Questions length:', questions.length);

    try {
      if (userAnswers.length === 0) {
        console.error('❌ ERREUR: Aucune réponse utilisateur trouvée');
        throw new Error('Aucune réponse utilisateur trouvée');
      }

      const correctAnswers = userAnswers.filter(a => a.is_correct).length;
      const totalQuestions = questions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const passed = score >= 75; // Seuil de réussite

      console.log('✅ Calculs:', { correctAnswers, totalQuestions, score, passed });

      // Créer ou mettre à jour la session de test dans la base
      const currentTime = new Date().toISOString();
      const startTime = sessionStartTime.current || currentTime; // Fallback si pas défini
      
      console.log('Session timing:', { startTime, currentTime });
      
      // Pour les sessions de rattrapage, utiliser 99 comme session_number
      const sessionNumberForDB = sessionType === 'remedial' ? 99 : sessionNumber;
      
      console.log('💾 Tentative de sauvegarde session avec params:', {
        user_id: user.id,
        level: sessionLevel,
        session_number: sessionNumberForDB,
        session_type: sessionType,
        score: score,
        status: 'completed',
        total_questions: totalQuestions,
        started_at: startTime,
        ended_at: currentTime,
        is_session_validated: passed,
        required_score_percentage: 75
      });

      const { data: sessionData, error: sessionError } = await supabase
        .from('test_sessions')
        .upsert({
          user_id: user.id,
          level: sessionLevel,
          session_number: sessionNumberForDB,
          session_type: sessionType,
          score: score,
          status: 'completed',
          total_questions: totalQuestions,
          started_at: startTime,
          ended_at: currentTime,
          is_session_validated: passed,
          required_score_percentage: 75
        }, {
          onConflict: 'user_id,level,session_number,session_type'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ ERREUR SESSION:', sessionError);
        console.error('❌ Détails erreur:', JSON.stringify(sessionError, null, 2));
        throw sessionError;
      }

      if (!sessionData) {
        console.error('❌ ERREUR: Aucune donnée de session retournée');
        throw new Error('Aucune donnée de session retournée');
      }

      console.log('✅ Session sauvegardée avec succès, ID:', sessionData.id);

      // Enregistrer les réponses avec l'ID de session
      console.log('📝 Préparation des réponses à insérer...');
      console.log('UserAnswers avant traitement:', userAnswers);
      
      const answersToInsert = userAnswers.map((answer, index) => {
        console.log(`Réponse ${index + 1}:`, answer);
        return {
          user_id: user.id,
          session_id: sessionData.id,
          question_id: answer.question_id, // Garder le type bigint
          user_answer: answer.user_answer,
          is_correct: answer.is_correct,
          answered_at: new Date().toISOString(),
          created_at: new Date().toISOString()
          // Ne pas inclure l'id pour laisser la DB auto-générer
        };
      });

      console.log('Answers to insert:', answersToInsert);
      console.log('Session ID:', sessionData.id);

      console.log('=== DÉBUT SAUVEGARDE RÉPONSES ===');
      console.log('Session ID pour suppression:', sessionData.id);
      
      // Supprimer d'abord toutes les réponses existantes pour cette session
      console.log('🗑️ Suppression des réponses existantes...');
      const { error: deleteError } = await supabase
        .from('test_answers')
        .delete()
        .eq('session_id', sessionData.id);

      if (deleteError) {
        console.error('❌ Erreur suppression:', deleteError);
        console.error('❌ Détails erreur suppression:', JSON.stringify(deleteError, null, 2));
        throw deleteError;
      }
      
      console.log('✅ Suppression réussie, insertion des nouvelles réponses...');
      console.log('📤 Données à insérer:', JSON.stringify(answersToInsert, null, 2));

      // Utiliser upsert au lieu d'insert pour éviter les conflits de contraintes d'unicité
      const { error: answersError } = await supabase
        .from('test_answers')
        .upsert(answersToInsert, {
          onConflict: 'user_id,session_id,question_id'
        });

      console.log('📥 Résultat insertion:', { answersError });

      if (answersError) {
        console.error('❌ ERREUR INSERTION RÉPONSES:', answersError);
        console.error('❌ Détails erreur insertion:', JSON.stringify(answersError, null, 2));
        throw answersError;
      }

      console.log('🎉 SAUVEGARDE RÉPONSES RÉUSSIE ===');

      // Sauvegarder aussi dans question_attempts pour les statistiques
      const questionAttemptsData = userAnswers.map(answer => ({
        user_id: user.id,
        question_id: answer.question_id,
        level: sessionLevel,
        is_correct: answer.is_correct,
        attempts_count: 1,
        last_attempt_at: new Date().toISOString()
      }));

      // Upsert dans question_attempts (mise à jour ou insertion)
      for (const attempt of questionAttemptsData) {
        await supabase
          .from('question_attempts')
          .upsert(attempt, { 
            onConflict: 'user_id,question_id',
            ignoreDuplicates: false 
          });
      }

      // Mettre à jour la progression selon le type de session
      let progressResult: { levelCompleted: boolean; certification: any } = { levelCompleted: false, certification: null };
      
      if (sessionType === 'remedial') {
        // Pour les sessions de rattrapage, utiliser 99 comme numéro de session
        if (passed) {
          progressResult = await updateProgress(99, true, score);
        }
      } else {
        // Pour les sessions normales
        if (passed) {
          progressResult = await updateProgress(sessionNumber, true, score);
        }
      }

      // Mettre à jour les statistiques utilisateur
      await refetchStats();

      setSessionResults({
        score,
        correctAnswers,
        totalQuestions,
        passed,
        levelCompleted: progressResult.levelCompleted,
        certification: progressResult.certification
      });
      
      setTestCompleted(true);

      toast({
        title: passed ? "Session réussie !" : "Session échouée",
        description: passed 
          ? `Félicitations ! Vous avez obtenu ${score}% et validé cette session.`
          : `Vous avez obtenu ${score}%. Il faut 75% minimum pour valider la session.`,
        variant: passed ? "default" : "destructive"
      });

      // Ajouter un toast spécial pour la certification
      if (progressResult.levelCompleted && progressResult.certification) {
        setTimeout(() => {
          toast({
            title: "🏆 Certification obtenue !",
            description: `Félicitations ! Vous avez obtenu votre certification de niveau ${sessionLevel} avec ${progressResult.certification?.score || 0}% !`,
            variant: "default"
          });
        }, 1000);
      }

    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les résultats.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingSession(false);
    }
  }, [user, userAnswers, questions, sessionLevel, sessionNumber, sessionType, updateProgress, isCompletingSession]);

  // Gestion des réponses selon le type de question
  const handleAnswerChange = (value: string) => {
    setCurrentAnswer(value);
  };

  useEffect(() => {
    if (user) {
      loadSessionQuestions();
    }
  }, [loadSessionQuestions]);

  // Redirection si pas d'utilisateur
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Déclencher completeSession quand testCompleted devient true
  useEffect(() => {
    if (testCompleted && !sessionResults && !completionRef.current) {
      completeSession();
    }
  }, [testCompleted, sessionResults]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement de la session...</h1>
          <p className="text-muted-foreground">Session {sessionNumber} - Niveau {sessionLevel}</p>
        </div>
      </div>
    );
  }

  if (testCompleted && sessionResults) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Affichage de la certification si obtenue */}
          {sessionResults.levelCompleted && sessionResults.certification && (
            <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Trophy className="h-20 w-20 text-yellow-600" />
                </div>
                <CardTitle className="text-3xl text-yellow-800">
                  🎉 Félicitations ! 🎉
                </CardTitle>
                <p className="text-yellow-700 text-lg font-medium">
                  Vous avez obtenu votre certification de niveau {sessionLevel} !
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="bg-white/80 rounded-lg p-4 border border-yellow-200">
                  <p className="text-lg font-semibold text-yellow-800">
                    Certification de niveau {sessionResults.certification.level}
                  </p>
                  <p className="text-yellow-700">
                    Score final : {sessionResults.certification.score}%
                  </p>
                  <p className="text-sm text-yellow-600">
                    Obtenue le : {new Date(sessionResults.certification.certified_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    <Star className="h-3 w-3 mr-1" />
                    Niveau {sessionLevel} maîtrisé
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Résultats de la session */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {sessionResults.passed ? (
                  <CheckCircle className="h-16 w-16 text-green-600" />
                ) : (
                  <AlertTriangle className="h-16 w-16 text-orange-600" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {sessionResults.passed ? 'Session validée !' : 'Session à reprendre'}
              </CardTitle>
              <p className="text-muted-foreground">
                Session {sessionNumber} - Niveau {sessionLevel}
                {sessionType === 'remedial' && ' (Rattrapage)'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold">
                  {sessionResults.score}%
                </div>
                <p className="text-lg">
                  {sessionResults.correctAnswers} / {sessionResults.totalQuestions} questions correctes
                </p>
                <Progress value={sessionResults.score} className="h-3" />
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au tableau de bord
                </Button>
                
                {!sessionResults.passed && (
                  <Button 
                    onClick={() => window.location.reload()}
                  >
                    Reprendre la session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Aucune question disponible</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Message d'avertissement anti-triche */}
      {warningMessage && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center font-medium text-sm">
          {warningMessage}
        </div>
      )}
      <div className="p-4">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              Session {sessionNumber} - Niveau {sessionLevel}
            </h1>
            {sessionType === 'remedial' && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Session de rattrapage
              </Badge>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-1">
            <div>Question {currentQuestionIndex + 1} / {questions.length}</div>
            <div className="text-xs opacity-60">ID: {currentQuestion.id}</div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Message d'avertissement pour les réponses */}
        {currentQuestionIndex === 0 && (
          <div className="mb-6 max-w-2xl mx-auto">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-2">⚠️ Important - Instructions pour les réponses</p>
                    <p>
                      {instructions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
            </CardTitle>
            {currentQuestion.rule && (
              <p className="text-sm text-muted-foreground">
                Règle : {currentQuestion.rule}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg">
              {currentQuestion.content}
            </div>

            {!showExplanation && (
              <div className="space-y-4">
                {currentQuestion.type === 'QCM' && currentQuestion.choices && currentQuestion.choices.length > 0 ? (
                  <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange}>
                    {currentQuestion.choices.map((choice, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={choice} id={`choice-${index}`} />
                        <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1">
                          {choice}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="answer">Votre réponse :</Label>
                    <Input
                      id="answer"
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Tapez votre réponse ici..."
                      className="text-lg"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-form-type="other"
                    />
                  </div>
                )}

                <Button 
                  onClick={submitAnswer} 
                  disabled={!currentAnswer.trim()}
                  className="w-full"
                >
                  Valider la réponse
                </Button>
              </div>
            )}

            {showExplanation && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  userAnswers[userAnswers.length - 1]?.is_correct 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {userAnswers[userAnswers.length - 1]?.is_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {userAnswers[userAnswers.length - 1]?.is_correct ? 'Correct !' : 'Incorrect'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Votre réponse :</strong> {currentAnswer}</p>
                    <p><strong>Réponse correcte :</strong> {currentQuestion.answer}</p>
                  </div>
                </div>

                {currentQuestion.explanation && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Explication :</h4>
                    <p className="text-blue-800">{currentQuestion.explanation}</p>
                  </div>
                )}

                <Button 
                  onClick={nextQuestion}
                  className="w-full"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Question suivante' : 'Terminer la session'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionTest;