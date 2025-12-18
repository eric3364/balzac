import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, Calendar, TrendingUp } from 'lucide-react';
import { useUserPlanningObjectives, PlanningObjective } from '@/hooks/usePlanningObjectives';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { fr } from 'date-fns/locale';

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

          return (
            <div 
              key={objective.id} 
              className={`p-4 rounded-lg border ${isUrgent ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-background'}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Info objectif */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
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
