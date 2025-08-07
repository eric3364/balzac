import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionProgress } from '@/hooks/useSessionProgress';
import { useUserStats } from '@/hooks/useUserStats';
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
  answer: string;
  type: string;
  level: number;
  rule?: string;
  explanation?: string;
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
  } | null>(null);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const completionRef = useRef(false);
  const sessionStartTime = useRef<string | null>(null);

  // Charger les questions de la session
  const loadSessionQuestions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('Loading session questions for:', { sessionLevel, sessionNumber, sessionType });

      // Récupérer le pourcentage de questions configuré
      const { data: configData, error: configError } = await supabase
        .from('site_configuration')
        .select('config_value')
        .eq('config_key', 'questions_percentage_per_level')
        .single();

      console.log('Config data:', configData, 'Error:', configError);

      const questionsPercentage = parseInt(configData?.config_value as string) || 20;
      console.log('Questions percentage:', questionsPercentage);

      // Vérifier d'abord s'il y a des questions pour ce niveau
      const { data: questionsCount, error: countError } = await supabase
        .from('questions')
        .select('id')
        .eq('level', sessionLevel);

      console.log('Questions count for level', sessionLevel, ':', questionsCount?.length, 'Error:', countError);

      if (!questionsCount || questionsCount.length === 0) {
        toast({
          title: "Aucune question disponible",
          description: `Aucune question n'est disponible pour le niveau ${sessionLevel}.`,
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      // Calculer les questions par session et l'offset avec numérotation simplifiée
      const questionsPerSession = Math.floor(questionsCount.length * questionsPercentage / 100);
      const sessionIndex = sessionNumber - 1; // Session 1 = index 0, Session 2 = index 1, etc.
      const offset = sessionIndex * questionsPerSession;

      console.log('Session calculation:', {
        totalQuestions: questionsCount.length,
        questionsPerSession,
        sessionIndex,
        offset
      });

      let sessionQuestions, error;
      
      if (sessionType === 'remedial') {
        // Pour les sessions de rattrapage, récupérer directement TOUTES les questions échouées
        console.log('Loading remedial session - fetching all failed questions for level', sessionLevel);
        
        const { data: failedQuestionsData, error: failedError } = await supabase
          .from('failed_questions')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('level', sessionLevel)
          .eq('is_remediated', false);

        if (failedError) {
          error = failedError;
          sessionQuestions = null;
        } else if (!failedQuestionsData || failedQuestionsData.length === 0) {
          toast({
            title: "Aucune question de rattrapage",
            description: "Vous n'avez aucune question échouée à revoir pour ce niveau.",
            variant: "default"
          });
          navigate('/dashboard');
          return;
        } else {
          // Récupérer les détails des questions échouées
          const questionIds = failedQuestionsData.map(fq => fq.question_id);
          console.log('Failed question IDs:', questionIds);
          
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds)
            .eq('level', sessionLevel)
            .order('id');
            
          sessionQuestions = questionsData;
          error = questionsError;
        }
      } else {
        // Pour les sessions normales, utiliser la méthode simple avec offset
        const questionsPerSession = Math.floor(questionsCount.length * questionsPercentage / 100);
        const sessionIndex = sessionNumber - 1;
        const offset = sessionIndex * questionsPerSession;
        
        const { data, error: rpcError } = await supabase
          .from('questions')
          .select('*')
          .eq('level', sessionLevel)
          .range(offset, offset + questionsPerSession - 1)
          .order('id');
          
        sessionQuestions = data;
        error = rpcError;
      }

      console.log('Session questions:', sessionQuestions, 'Error:', error);

      if (error) throw error;

      if (!sessionQuestions || sessionQuestions.length === 0) {
        toast({
          title: "Aucune question",
          description: "Aucune question disponible pour cette session.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setQuestions(sessionQuestions);
      
      // Enregistrer le temps de début de la session
      if (!sessionStartTime.current) {
        sessionStartTime.current = new Date().toISOString();
        console.log('Session started at:', sessionStartTime.current);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les questions de la session: ${error?.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionLevel, sessionNumber, navigate]);

  // Enregistrer la réponse actuelle
  const submitAnswer = useCallback(() => {
    if (!currentAnswer.trim()) {
      toast({
        title: "Réponse requise",
        description: "Veuillez sélectionner ou saisir une réponse.",
        variant: "destructive"
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();

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
      // Petite pause pour que l'utilisateur voie que c'est correct
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setCurrentAnswer('');
          setShowExplanation(false);
        } else {
          // Déclencher la complétion via un state
          setTestCompleted(true);
        }
      }, 500);
    } else {
      setShowExplanation(true);
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

    try {
      const correctAnswers = userAnswers.filter(a => a.is_correct).length;
      const totalQuestions = questions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const passed = score >= 75; // Seuil de réussite

      console.log('Calculs:', { correctAnswers, totalQuestions, score, passed });

      // Créer ou mettre à jour la session de test dans la base
      const currentTime = new Date().toISOString();
      const startTime = sessionStartTime.current || currentTime; // Fallback si pas défini
      
      console.log('Session timing:', { startTime, currentTime });
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('test_sessions')
        .upsert({
          user_id: user.id,
          level: sessionLevel,
          session_number: sessionNumber,
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
        console.error('Erreur session:', sessionError);
        throw sessionError;
      }

      // Enregistrer les réponses avec l'ID de session
      const answersToInsert = userAnswers.map(answer => ({
        user_id: user.id,
        session_id: sessionData.id,
        question_id: answer.question_id, // Garder le type bigint
        user_answer: answer.user_answer,
        is_correct: answer.is_correct,
        answered_at: new Date().toISOString(),
        created_at: new Date().toISOString()
        // Ne pas inclure l'id pour laisser la DB auto-générer
      }));

      console.log('Answers to insert:', answersToInsert);
      console.log('Session ID:', sessionData.id);

      console.log('=== DÉBUT SAUVEGARDE RÉPONSES ===');
      console.log('Session ID pour suppression:', sessionData.id);
      
      // Supprimer d'abord toutes les réponses existantes pour cette session
      const { error: deleteError } = await supabase
        .from('test_answers')
        .delete()
        .eq('session_id', sessionData.id);

      if (deleteError) {
        console.error('Erreur suppression:', deleteError);
        throw deleteError;
      }
      
      console.log('Suppression réussie, insertion des nouvelles réponses...');

      // Puis insérer les nouvelles réponses
      const { error: answersError } = await supabase
        .from('test_answers')
        .insert(answersToInsert);

      console.log('Résultat insertion:', { answersError });

      if (answersError) {
        console.error('Erreur insertion réponses:', answersError);
        throw answersError;
      }

      console.log('=== SAUVEGARDE RÉPONSES RÉUSSIE ===');

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

      // Mettre à jour la progression si la session est réussie
      if (passed) {
        await updateProgress(sessionNumber, true);
      }

      // Mettre à jour les statistiques utilisateur
      await refetchStats();

      setSessionResults({
        score,
        correctAnswers,
        totalQuestions,
        passed
      });
      
      setTestCompleted(true);

      toast({
        title: passed ? "Session réussie !" : "Session échouée",
        description: passed 
          ? `Félicitations ! Vous avez obtenu ${score}% et validé cette session.`
          : `Vous avez obtenu ${score}%. Il faut 75% minimum pour valider la session.`,
        variant: passed ? "default" : "destructive"
      });

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
        <div className="max-w-2xl mx-auto">
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
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
                {currentQuestion.type === 'QCM' && currentQuestion.choices ? (
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