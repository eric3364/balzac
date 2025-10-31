import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Trophy, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getLevelName } from '@/lib/levelMapping';

interface Question {
  id: number;
  content: string;
  choices: string[] | null;
  type: string;
  level: string;
  rule?: string;
  explanation?: string;
}

interface TestSession {
  id: string;
  started_at: string | null;
  total_questions: number | null;
  current_level: number | null;
  current_batch: number | null;
  questions_mastered: number | null;
  certification_target: boolean | null;
  created_at: string | null;
  deleted_at: string | null;
}

interface UserCertification {
  id: string;
  level: number;
  certified_at: string;
  score: number;
}

interface QuestionAttempt {
  question_id: number;
  attempts_count: number;
  is_correct: boolean;
}

interface TestBatch {
  id: string;
  batch_number: number;
  level: number;
  questions_count: number | null;
  completed_at: string | null;
  created_at: string | null;
}

export default function Test() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { questionsPerTest } = useSiteConfig();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(0);
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<{ [key: number]: QuestionAttempt }>({});
  const [currentBatch, setCurrentBatch] = useState<TestBatch | null>(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState<Set<number>>(new Set());
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<number>>(new Set());
  const [batchScore, setBatchScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  // Anti-cheat system
  const handleTestTerminated = () => {
    setIsCompleted(true);
    toast({
      title: "Test interrompu",
      description: "Le test a été interrompu pour cause de triche détectée.",
      variant: "destructive"
    });
    endTestSession();
    navigate('/dashboard');
  };

  const { attempts, isTerminated, isLocked, warningMessage } = useAntiCheat({
    onTestTerminated: handleTestTerminated,
    isActive: !isCompleted && !loading && questions.length > 0,
    strictMode: true // Mode verrouillage complet
  });

  // Timer effect
  useEffect(() => {
    if (testSession && !isCompleted) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    return;
  }, [testSession, isCompleted]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (testSession) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon('/api/end-session', JSON.stringify({
          sessionId: testSession.id
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also cleanup when component unmounts
      endTestSession();
    };
  }, [testSession]);

  // Load initial data
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadInitialData();
  }, [user, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Get user's max certified level
      const { data: maxLevelData } = await supabase
        .rpc('get_user_max_level', { user_uuid: user!.id });
      
      const userMaxLevel = maxLevelData || 0;
      setMaxLevel(userMaxLevel);
      
      // Start with the next level to certify
      const targetLevel = userMaxLevel + 1;
      setCurrentLevel(targetLevel);
      
      // Load user certifications
      const { data: certificationsData } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('user_id', user!.id);
      
      setCertifications((certificationsData || []).map(cert => ({
        ...cert,
        certified_at: cert.certified_at || '',
        issuing_organization: cert.issuing_organization || 'Organisation',
        expiration_date: cert.expiration_date || null,
        created_at: cert.created_at || ''
      })));
      
      // Load questions for the target level
      await loadQuestionsForLevel(targetLevel);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du test.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForLevel = async (level: number, excludeIds: number[] = []) => {
    try {
      // Get completed question IDs for this level
      const { data: attemptsData } = await supabase
        .from('question_attempts')
        .select('question_id')
        .eq('user_id', user!.id)
        .eq('level', level)
        .eq('is_correct', true);
      
      const completedIds = attemptsData?.map(a => a.question_id) || [];
      setCompletedQuestionIds(new Set(completedIds));
      
      // Get questions via edge function (secure - no answers exposed)
      const { data: questionsData, error } = await supabase.functions.invoke('get-session-questions', {
        body: {
          level: level,
          session_number: 1,
          session_type: 'regular',
          questions_percentage: 100 // Get all questions for this mode
        }
      });
      
      if (error) throw error;
      
      if (!questionsData || questionsData.length === 0) {
        // No more questions available for this level
        await checkCertificationEligibility(level);
        return;
      }
      
      // Filter out completed questions and shuffle
      const availableQuestions = questionsData
        .filter((q: any) => !completedIds.includes(q.id) && !excludeIds.includes(q.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, questionsPerTest);
      
      if (availableQuestions.length === 0) {
        await checkCertificationEligibility(level);
        return;
      }
      
      setQuestions(availableQuestions.map((q: any) => ({
        id: q.id,
        content: q.content || '',
        type: q.type || 'multiple_choice',
        level: q.level || '',
        rule: q.rule || '',
        explanation: q.explanation || '',
        choices: Array.isArray(q.choices) ? q.choices : []
      })));
      
      // First, complete any existing in-progress sessions and clean up deleted ones
      await supabase
        .from('test_sessions')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('user_id', user!.id)
        .eq('status', 'in_progress');

      // Clean up any sessions marked as deleted
      await supabase
        .from('test_sessions')
        .delete()
        .eq('user_id', user!.id)
        .not('deleted_at', 'is', null);

      // Create test session with unique ID (always generate new UUID)
      const { data: sessionData, error: sessionError } = await supabase
        .from('test_sessions')
        .insert({
          user_id: user!.id,
          status: 'in_progress',
          total_questions: shuffledQuestions.length,
          current_level: level,
          current_batch: 1,
          certification_target: true
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      setTestSession(sessionData);
      
      // Create test batch
      const { data: batchData, error: batchError } = await supabase
        .from('test_batches')
        .insert({
          user_id: user!.id,
          batch_number: 1,
          level: level,
          questions_count: shuffledQuestions.length
        })
        .select()
        .single();
      
      if (batchError) throw batchError;
      
      setCurrentBatch(batchData);
      
      // Reset counters
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTotalAnswered(0);
      setCorrectAnswers(0);
      setBatchScore(0);
      
    } catch (error) {
      console.error('Error loading questions:', error);
      
      // Messages d'erreur plus spécifiques
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') {
          toast({
            title: "Session en cours",
            description: "Une session de test est déjà active. Veuillez patienter...",
            variant: "destructive"
          });
          return;
        }
      }
      
      toast({
        title: "Erreur",
        description: `Impossible de charger le test: ${(error as any)?.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowExplanation(false);
  };

  const handleNextQuestion = async () => {
    if (!selectedAnswer) {
      toast({
        title: "Sélectionnez une réponse",
        description: "Veuillez choisir une réponse avant de continuer.",
        variant: "destructive"
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    try {
      // Validate answer via secure edge function
      const { data: validationResult, error } = await supabase.functions.invoke('validate-answer', {
        body: {
          question_id: currentQuestion.id,
          user_answer: selectedAnswer
        }
      });

      if (error) throw error;

      const isCorrect = validationResult.is_correct;
      
      // Update counters
      const newTotalAnswered = totalAnswered + 1;
      const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0);
      const newBatchScore = Math.round((newCorrectAnswers / newTotalAnswered) * 100);
      
      setTotalAnswered(newTotalAnswered);
      setCorrectAnswers(newCorrectAnswers);
      setBatchScore(newBatchScore);
      
      // Show explanation for incorrect answers (from server response)
      if (!isCorrect && validationResult.explanation) {
        setLastAnswer({ correct: false, explanation: validationResult.explanation });
        setShowExplanation(true);
        // Update question with server explanation
        setQuestions(prev => prev.map((q, idx) => 
          idx === currentQuestionIndex 
            ? { ...q, explanation: validationResult.explanation, rule: validationResult.rule }
            : q
        ));
      } else {
        setLastAnswer({ correct: isCorrect });
      }
      
      // Save/update question attempt
      await saveQuestionAttempt(currentQuestion.id, isCorrect);

      // Update local state
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
      
      if (!isCorrect) {
        setIncorrectQuestions(prev => new Set([...prev, currentQuestion.id]));
      }

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer('');
      } else {
        // Batch completed
        await completeBatch();
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider votre réponse. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  const saveQuestionAttempt = async (questionId: number, isCorrect: boolean) => {
    try {
      // Get existing attempt
      const { data: existingAttempt } = await supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user!.id)
        .eq('question_id', questionId)
        .eq('level', currentLevel)
        .maybeSingle();
      
      if (existingAttempt) {
        // Update existing attempt
        await supabase
          .from('question_attempts')
          .update({
            attempts_count: (existingAttempt.attempts_count || 0) + 1,
            is_correct: isCorrect,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', existingAttempt.id);
      } else {
        // Create new attempt
        await supabase
          .from('question_attempts')
          .insert({
            user_id: user!.id,
            question_id: questionId,
            level: currentLevel,
            attempts_count: 1,
            is_correct: isCorrect,
            last_attempt_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error saving question attempt:', error);
    }
  };

  const completeBatch = async () => {
    try {
      // Update batch as completed
      if (currentBatch) {
        await supabase
          .from('test_batches')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', currentBatch.id);
      }
      
      setIsBatchCompleted(true);
      
      // Check if user reached 75% for certification
      if (batchScore >= 75) {
        await checkCertificationEligibility(currentLevel);
      }
      
    } catch (error) {
      console.error('Error completing batch:', error);
    }
  };

  const checkCertificationEligibility = async (level: number) => {
    try {
      const levelName = getLevelName(level);
      // Get all correct attempts for this level
      const { data: correctAttempts } = await supabase
        .from('question_attempts')
        .select('question_id')
        .eq('user_id', user!.id)
        .eq('level', level)
        .eq('is_correct', true);
      
      // Get total questions for this level
      const { data: totalQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('level', levelName);
      
      const correctCount = correctAttempts?.length || 0;
      const totalCount = totalQuestions?.length || 0;
      
      if (totalCount === 0) return;
      
      const overallScore = Math.round((correctCount / totalCount) * 100);
      
      if (overallScore >= 75) {
        // User is certified for this level
        await createCertification(level, overallScore);
        setIsCompleted(true);
        setScore(overallScore);
      }
      
    } catch (error) {
      console.error('Error checking certification eligibility:', error);
    }
  };

  const createCertification = async (level: number, score: number) => {
    try {
      const { data: certification, error } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user!.id,
          level: level,
          score: score
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCertifications(prev => [...prev, {
        ...certification,
        certified_at: certification.certified_at || '',
        issuing_organization: certification.issuing_organization || 'Organisation',
        expiration_date: certification.expiration_date || null,
        created_at: certification.created_at || ''
      }]);
      
      toast({
        title: "🎉 Certification obtenue !",
        description: `Félicitations ! Vous êtes certifié niveau ${level} avec ${score}% de réussite.`,
      });
      
    } catch (error) {
      console.error('Error creating certification:', error);
    }
  };

  const continueWithNewBatch = async () => {
    const incorrectIds = Array.from(incorrectQuestions);
    await loadQuestionsForLevel(currentLevel, []);
    setIsBatchCompleted(false);
    setIncorrectQuestions(new Set());
  };

  const endTestSession = async () => {
    if (testSession) {
      try {
        await supabase
          .from('test_sessions')
          .update({ 
            ended_at: new Date().toISOString(),
            status: 'completed' 
          })
          .eq('id', testSession.id);
      } catch (error) {
        console.error('Error ending test session:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement du test...</h1>
          <p className="text-muted-foreground">Préparation de vos questions niveau {currentLevel}</p>
        </div>
      </div>
    );
  }

  // Batch completion screen
  if (isBatchCompleted && !isCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={async () => {
              await endTestSession();
              navigate('/dashboard');
            }} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Star className="h-6 w-6 text-yellow-500" />
                  Lot de {questionsPerTest} questions terminé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{batchScore}%</div>
                  <p className="text-muted-foreground">Score de ce lot</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-green-600">{correctAnswers}</div>
                    <p className="text-sm text-muted-foreground">Correctes</p>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-red-600">{totalAnswered - correctAnswers}</div>
                    <p className="text-sm text-muted-foreground">Incorrectes</p>
                  </div>
                </div>

                {batchScore >= 75 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      Excellent ! Vous progressez vers la certification niveau {currentLevel}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-medium">
                      Continuez vos efforts ! Il vous faut 75% pour obtenir la certification.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button onClick={continueWithNewBatch} size="lg">
                    Continuer avec {questionsPerTest} nouvelles questions
                  </Button>
                  <Button variant="outline" onClick={async () => {
                    await endTestSession();
                    navigate('/dashboard');
                  }}>
                    Arrêter et revenir au tableau de bord
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Final certification screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={async () => {
              await endTestSession();
              navigate('/dashboard');
            }} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">🎉 Certification obtenue !</h1>
              <p className="text-xl text-muted-foreground">
                Niveau {currentLevel} certifié avec <span className="font-bold text-primary">{score}%</span>
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Félicitations !</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    Vous avez obtenu votre certification niveau {currentLevel} ! 
                    Le niveau {currentLevel + 1} est maintenant disponible.
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <span>Temps total :</span>
                  <span className="font-semibold">{formatTime(timer)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Score final :</span>
                  <span className="font-semibold text-green-600">{score}%</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 flex gap-4 justify-center">
              <Button onClick={async () => {
                await endTestSession();
                navigate('/dashboard');
              }} size="lg">
                Retour au tableau de bord
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Continuer vers le niveau {currentLevel + 1}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Aucune question disponible</h1>
          <p className="text-muted-foreground">Toutes les questions de ce niveau ont été complétées.</p>
          <Button onClick={async () => {
            await endTestSession();
            navigate('/dashboard');
          }} className="mt-4">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Safety check: if currentQuestion is undefined, show loading state
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement en cours...</h1>
          <p className="text-muted-foreground">Préparation de votre question</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Message d'avertissement anti-triche */}
      {warningMessage && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center font-medium text-sm">
          {warningMessage}
        </div>
      )}
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={async () => {
            await endTestSession();
            navigate('/dashboard');
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Niveau {currentLevel}</Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(timer)}
              </div>
              <span>
                Question {currentQuestionIndex + 1} sur {questions.length}
              </span>
              <span>Score: {batchScore}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <Progress value={progress} className="w-full" />
        </div>
      </div>

      {/* Message d'avertissement pour les réponses */}
      {currentQuestionIndex === 0 && (
        <div className="container mx-auto px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-2">⚠️ Important - Instructions pour les réponses</p>
                    <p>
                      Attention vos réponses doivent être écrites parfaitement en respectant la casse et la ponctuation éventuelle. 
                      Vous ne pouvez-pas répondre réponse 1, 2 ou 3 ou bien A, B, C. !
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Show explanation if needed */}
          {showExplanation && lastAnswer && !lastAnswer.correct && lastAnswer.explanation && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  Explication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">{lastAnswer.explanation}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="space-y-3">
                {/* Numéro de la question et ID */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-primary">
                    Question {currentQuestionIndex + 1}
                  </div>
                  <div className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                    ID: {currentQuestion.id}
                  </div>
                </div>
                
                {/* Niveau et type */}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Niveau {currentQuestion.level}</Badge>
                  <Badge variant="outline">{currentQuestion.type}</Badge>
                </div>
                
                {/* Règle (si présente) */}
                {currentQuestion.rule && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-800 mb-1">Règle :</div>
                    <div className="text-blue-700">{currentQuestion.rule}</div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contenu de la question */}
              <div className="text-lg font-medium leading-relaxed bg-gray-50 p-4 rounded-lg border">
                {currentQuestion.content}
              </div>

              {/* Champ de saisie libre - toujours disponible */}
              <div className="space-y-3">
                <Label htmlFor="answer-input" className="text-sm font-medium">Votre réponse :</Label>
                <Input
                  id="answer-input"
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Tapez votre réponse ici..."
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  {correctAnswers} correctes sur {totalAnswered} répondues
                </div>
                <Button 
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  size="lg"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Terminer le lot' : 'Question suivante'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}