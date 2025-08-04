import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: number;
  content: string;
  choices: string[];
  answer: string;
  type: string;
  level: number;
  rule?: string;
}

interface TestSession {
  id: string;
  started_at: string;
  total_questions: number;
}

const Test = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Timer effect
  useEffect(() => {
    if (testSession && !testCompleted) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testSession, testCompleted]);

  // Load questions on component mount
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadQuestions();
  }, [user, navigate]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch 10 random questions
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .limit(10);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les questions.",
          variant: "destructive"
        });
        return;
      }

      if (!questionsData || questionsData.length === 0) {
        toast({
          title: "Aucune question",
          description: "Aucune question disponible pour le moment.",
          variant: "destructive"
        });
        return;
      }

      setQuestions(questionsData);
      
      // Create test session
      const { data: sessionData, error: sessionError } = await supabase
        .from('test_sessions')
        .insert({
          user_id: user.id,
          status: 'in_progress',
          total_questions: questionsData.length,
          level: 1
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating test session:', sessionError);
      } else {
        setTestSession(sessionData);
      }

    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
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
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    // Save answer to database
    if (testSession && user) {
      await supabase.from('test_answers').insert({
        session_id: testSession.id,
        question_id: currentQuestion.id.toString(),
        user_answer: selectedAnswer,
        is_correct: isCorrect,
        user_id: user.id,
        answered_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }

    // Update local state
    const newAnswers = [...userAnswers, selectedAnswer];
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
    } else {
      // Test completed
      await completeTest(newAnswers);
    }
  };

  const completeTest = async (finalAnswers: string[]) => {
    const correctAnswers = questions.filter((question, index) => 
      finalAnswers[index] === question.answer
    ).length;
    
    const finalScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(finalScore);
    setTestCompleted(true);

    // Update test session
    if (testSession && user) {
      await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          score: finalScore,
          ended_at: new Date().toISOString()
        })
        .eq('id', testSession.id);
    }

    toast({
      title: "Test terminé !",
      description: `Votre score : ${finalScore}%`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement du test...</h1>
          <p className="text-muted-foreground">Préparation de vos questions</p>
        </div>
      </div>
    );
  }

  if (testCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              {score >= 70 ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2">Test terminé !</h1>
              <p className="text-xl text-muted-foreground">
                Votre score : <span className="font-bold text-primary">{score}%</span>
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Résultats détaillés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Questions répondues :</span>
                  <span className="font-semibold">{questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Réponses correctes :</span>
                  <span className="font-semibold text-green-600">
                    {questions.filter((q, i) => userAnswers[i] === q.answer).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Réponses incorrectes :</span>
                  <span className="font-semibold text-red-600">
                    {questions.filter((q, i) => userAnswers[i] !== q.answer).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Temps total :</span>
                  <span className="font-semibold">{formatTime(timeElapsed)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 flex gap-4 justify-center">
              <Button onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refaire un test
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(timeElapsed)}
            </div>
            <span>
              Question {currentQuestionIndex + 1} sur {questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <Progress value={progress} className="w-full" />
        </div>
      </div>

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              {currentQuestion.rule && (
                <CardDescription>
                  Règle : {currentQuestion.rule}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-lg font-medium leading-relaxed">
                {currentQuestion.content}
              </div>

              {currentQuestion.choices && currentQuestion.choices.length > 0 ? (
                <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
                  <div className="space-y-3">
                    {currentQuestion.choices.map((choice, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={choice} id={`choice-${index}`} />
                        <Label htmlFor={`choice-${index}`} className="flex-1 cursor-pointer">
                          {choice}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="answer-input">Votre réponse :</Label>
                  <input
                    id="answer-input"
                    type="text"
                    value={selectedAnswer}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Tapez votre réponse ici..."
                  />
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Niveau {currentQuestion.level} • {currentQuestion.type}
                </div>
                <Button 
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  size="lg"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Terminer le test' : 'Question suivante'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Test;