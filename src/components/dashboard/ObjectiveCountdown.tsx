import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, Clock, Calendar, TrendingUp, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUserPlanningObjectives, PlanningObjective } from '@/hooks/usePlanningObjectives';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, differenceInWeeks, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mapping des niveaux numériques vers les noms de niveau en base
const LEVEL_NAME_MAP: Record<number, string> = {
  1: 'élémentaire',
  2: 'intermédiaire',
  3: 'avancé',
};

interface CountdownProps {
  deadline: Date;
}

const Countdown = ({ deadline }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const days = differenceInDays(deadline, now);
      const hours = differenceInHours(deadline, now) % 24;
      const minutes = differenceInMinutes(deadline, now) % 60;
      const seconds = differenceInSeconds(deadline, now) % 60;

      setTimeLeft({ 
        days: Math.max(0, days), 
        hours: Math.max(0, hours), 
        minutes: Math.max(0, minutes), 
        seconds: Math.max(0, seconds) 
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className="flex gap-2 text-center">
      <div className="bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-primary">{timeLeft.days}</div>
        <div className="text-xs text-muted-foreground">jours</div>
      </div>
      <div className="bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-primary">{timeLeft.hours}</div>
        <div className="text-xs text-muted-foreground">heures</div>
      </div>
      <div className="bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-primary">{timeLeft.minutes}</div>
        <div className="text-xs text-muted-foreground">min</div>
      </div>
      <div className="bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-2xl font-bold text-primary">{timeLeft.seconds}</div>
        <div className="text-xs text-muted-foreground">sec</div>
      </div>
    </div>
  );
};

interface ObjectiveCountdownProps {
  progressPercentage?: number;
  currentCertificationLevel?: number;
}

export const ObjectiveCountdown = ({ 
  progressPercentage = 0, 
  currentCertificationLevel = 0 
}: ObjectiveCountdownProps) => {
  const { objectives, userSchool, userClass, loading } = useUserPlanningObjectives();
  const [sessionsPerLevel, setSessionsPerLevel] = useState<Record<number, number>>({});

  // Taux de réussite estimé (90% de réussite = certaines sessions devront être repassées)
  const SUCCESS_RATE = 0.90;

  // Charger le nombre de sessions par niveau (depuis les configs par niveau)
  useEffect(() => {
    const fetchSessionsPerLevel = async () => {
      // Récupérer les pourcentages de questions par niveau depuis site_configuration
      const { data: configData, error: configError } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'test_questions_percentage_level_1',
          'test_questions_percentage_level_2',
          'test_questions_percentage_level_3'
        ]);
      
      if (configError) {
        console.error('Error fetching config:', configError);
      }

      // Calculer le nombre de sessions par niveau
      const sessionsCount: Record<number, number> = {};
      
      for (let level = 1; level <= 3; level++) {
        const configKey = `test_questions_percentage_level_${level}`;
        const config = (configData || []).find(c => c.config_key === configKey);
        const percentage = config ? Number(config.config_value) : 20;
        // Nombre de sessions = 100 / pourcentage
        sessionsCount[level] = Math.ceil(100 / percentage);
      }

      setSessionsPerLevel(sessionsCount);
    };

    fetchSessionsPerLevel();
  }, []);

  // Calculer l'effort recommandé en sessions par semaine
  const calculateWorkload = (objective: PlanningObjective) => {
    const now = new Date();
    const deadline = new Date(objective.deadline);
    
    const weeksRemaining = Math.max(1, differenceInWeeks(deadline, now) || 1);
    
    let baseSessions = 0;
    
    if (objective.objective_type === 'certification') {
      const level = objective.target_certification_level || 1;
      baseSessions = sessionsPerLevel[level] || 0;
    } else {
      const progressTarget = objective.target_progression_percentage || 100;
      const allSessions = Object.values(sessionsPerLevel).reduce((sum, count) => sum + count, 0);
      baseSessions = Math.round((progressTarget / 100) * allSessions);
    }
    
    // Appliquer le facteur de taux de réussite (90% de réussite = 10% de sessions à repasser)
    const totalSessions = Math.ceil(baseSessions / SUCCESS_RATE);
    const sessionsPerWeek = totalSessions > 0 ? Math.ceil(totalSessions / weeksRemaining) : 0;
    
    return {
      sessionsPerWeek,
      totalSessions,
      baseSessions // Sessions sans les reprises
    };
  };

  // Calculer la progression temporelle
  const getTimeProgress = (objective: PlanningObjective) => {
    const now = new Date();
    const deadline = new Date(objective.deadline);
    const created = new Date(objective.created_at);
    
    const totalDuration = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    
    if (isPast(deadline)) return 100;
    if (elapsed <= 0) return 0;
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-primary/20 rounded w-3/4"></div>
              <div className="h-4 bg-primary/20 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (objectives.length === 0) {
    return null; // Pas d'objectifs à afficher
  }

  const getProgressForObjective = (objective: PlanningObjective) => {
    if (objective.objective_type === 'certification') {
      // Calcul du progrès vers le niveau de certification cible
      const targetLevel = objective.target_certification_level || 1;
      const progress = Math.min(100, (currentCertificationLevel / targetLevel) * 100);
      return {
        current: currentCertificationLevel,
        target: targetLevel,
        percentage: progress,
        label: `Niveau ${currentCertificationLevel} / ${targetLevel}`
      };
    } else {
      // Progression en pourcentage
      const targetPercentage = objective.target_progression_percentage || 100;
      const progress = Math.min(100, (progressPercentage / targetPercentage) * 100);
      return {
        current: progressPercentage,
        target: targetPercentage,
        percentage: progress,
        label: `${progressPercentage}% / ${targetPercentage}%`
      };
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Vos objectifs à atteindre
            </CardTitle>
            <CardDescription>
              {userSchool && (
                <span className="text-sm">
                  {userSchool} {userClass && `- ${userClass}`}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-background">
            <Clock className="h-3 w-3 mr-1" />
            {objectives.length} objectif{objectives.length > 1 ? 's' : ''} en cours
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {objectives.map((objective) => {
          const progress = getProgressForObjective(objective);
          const deadline = new Date(objective.deadline);
          const daysLeft = differenceInDays(deadline, new Date());
          const isUrgent = daysLeft <= 7;
          const workload = calculateWorkload(objective);
          const timeProgress = getTimeProgress(objective);
          
          // Vérifier si l'étudiant est en retard
          // On considère qu'il y a retard si la progression réelle est < 80% de la progression temporelle attendue
          const expectedProgress = timeProgress; // On devrait être à ce % de progression
          const actualProgress = progress.percentage;
          const progressRatio = expectedProgress > 0 ? actualProgress / expectedProgress : 1;
          const isOnTrack = progressRatio >= 0.8 || actualProgress >= 100;
          const isBehind = !isOnTrack && timeProgress > 10; // Seulement après 10% du temps écoulé

          return (
            <div 
              key={objective.id} 
              className={`p-4 rounded-lg border ${isUrgent ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-background'}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Info objectif */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {objective.objective_type === 'certification' ? (
                      <Badge variant="default">
                        <Target className="h-3 w-3 mr-1" />
                        Certification Niveau {objective.target_certification_level}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {objective.target_progression_percentage}% de progression
                      </Badge>
                    )}
                    {isUrgent && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                  </div>
                  
                  {objective.description && (
                    <p className="text-sm text-muted-foreground">{objective.description}</p>
                  )}

                  {/* Barre de progression */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Votre progression</span>
                      <span className="font-medium">{progress.label}</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>

                  {/* Alerte de rythme insuffisant */}
                  {isBehind && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <span className="font-semibold">Rythme insuffisant !</span> Vous êtes à {Math.round(actualProgress)}% de progression alors que {Math.round(timeProgress)}% du temps est écoulé.
                        {workload.sessionsPerWeek > 0 && (
                          <span className="block mt-1">
                            Augmentez votre rythme à <strong>{Math.ceil(workload.sessionsPerWeek * 1.5)} sessions/semaine</strong> pour rattraper.
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Indicateur positif si en avance */}
                  {isOnTrack && timeProgress > 20 && actualProgress < 100 && (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Vous êtes dans les temps ! Continuez ainsi.</span>
                    </div>
                  )}

                  {/* Effort recommandé */}
                  {workload.totalSessions > 0 && (
                    <div className="flex flex-wrap items-center gap-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Rythme recommandé:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-background">
                          <span className="font-bold text-primary">{workload.sessionsPerWeek}</span>
                          <span className="ml-1 text-muted-foreground">session{workload.sessionsPerWeek > 1 ? 's' : ''}/semaine</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({workload.totalSessions} sessions, dont ~{workload.totalSessions - workload.baseSessions} reprises)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Timeline temporelle avec semaines */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progression temporelle</span>
                      <span>{Math.round(timeProgress)}%</span>
                    </div>
                    {(() => {
                      const created = new Date(objective.created_at);
                      const totalWeeks = Math.max(1, Math.ceil(differenceInDays(deadline, created) / 7));
                      const elapsedWeeks = Math.floor((timeProgress / 100) * totalWeeks);
                      const remainingWeeks = totalWeeks - elapsedWeeks;
                      
                      return (
                        <>
                          <div className="relative h-5 bg-secondary rounded-full overflow-hidden">
                            {/* Segments de semaines avec couleurs différentes */}
                            {totalWeeks > 1 && totalWeeks <= 20 && Array.from({ length: totalWeeks }).map((_, index) => {
                              const segmentStart = (index / totalWeeks) * 100;
                              const segmentWidth = (1 / totalWeeks) * 100;
                              const isElapsed = index < elapsedWeeks;
                              const isCurrent = index === elapsedWeeks;
                              
                              return (
                                <div
                                  key={index}
                                  className={`absolute top-0 h-full transition-colors duration-300 ${
                                    isElapsed 
                                      ? 'bg-primary/80' 
                                      : isCurrent 
                                        ? 'bg-primary/40' 
                                        : 'bg-secondary'
                                  } ${index > 0 ? 'border-l border-background/50' : ''}`}
                                  style={{ 
                                    left: `${segmentStart}%`, 
                                    width: `${segmentWidth}%` 
                                  }}
                                />
                              );
                            })}
                            
                            {/* Traits verticaux entre les semaines */}
                            {totalWeeks > 1 && totalWeeks <= 20 && Array.from({ length: totalWeeks - 1 }).map((_, index) => {
                              const position = ((index + 1) / totalWeeks) * 100;
                              return (
                                <div 
                                  key={`line-${index}`}
                                  className="absolute top-0 h-full w-0.5 bg-background/70 z-10"
                                  style={{ left: `${position}%` }}
                                />
                              );
                            })}
                            
                            {/* Labels des semaines (affichés si <= 12 semaines) */}
                            {totalWeeks > 1 && totalWeeks <= 12 && (
                              <div className="absolute inset-0 flex items-center pointer-events-none">
                                {Array.from({ length: totalWeeks }).map((_, index) => {
                                  const isElapsed = index < elapsedWeeks;
                                  return (
                                    <span 
                                      key={index} 
                                      className={`flex-1 text-center text-[9px] font-medium z-20 ${
                                        isElapsed ? 'text-primary-foreground' : 'text-muted-foreground/70'
                                      }`}
                                    >
                                      S{index + 1}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Indicateur de position actuelle */}
                            <div 
                              className="absolute top-0 h-full w-1 bg-white shadow-lg z-20 transition-all duration-500"
                              style={{ left: `calc(${timeProgress}% - 2px)` }}
                            />
                          </div>
                          
                          {/* Légende des semaines */}
                          {totalWeeks > 1 && (
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                                {elapsedWeeks} sem. écoulée{elapsedWeeks > 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-secondary border border-border"></span>
                                {remainingWeeks} sem. restante{remainingWeeks > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Date limite */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Échéance: {format(deadline, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </div>

                {/* Compte à rebours */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Temps restant</span>
                  <Countdown deadline={deadline} />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ObjectiveCountdown;
