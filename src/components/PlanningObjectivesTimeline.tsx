import { usePlanningObjectives, PlanningObjective } from '@/hooks/usePlanningObjectives';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Target, MapPin, School, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PlanningObjectivesTimeline = () => {
  const { objectives, loading } = usePlanningObjectives();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Objectifs de planification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trier les objectifs par date limite
  const sortedObjectives = [...objectives]
    .filter(obj => obj.is_active)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  if (sortedObjectives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Objectifs de planification
          </CardTitle>
          <CardDescription>
            Timeline des objectifs en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun objectif de planification actif</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer la progression temporelle pour chaque objectif
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

  const getStatusInfo = (objective: PlanningObjective) => {
    const deadline = new Date(objective.deadline);
    const daysRemaining = differenceInDays(deadline, new Date());
    
    if (isPast(deadline)) {
      return { 
        status: 'expired', 
        label: 'Expiré', 
        color: 'bg-destructive text-destructive-foreground',
        progressColor: 'bg-destructive'
      };
    }
    if (daysRemaining <= 7) {
      return { 
        status: 'urgent', 
        label: 'Urgent', 
        color: 'bg-orange-500 text-white',
        progressColor: 'bg-orange-500'
      };
    }
    if (daysRemaining <= 30) {
      return { 
        status: 'soon', 
        label: 'Bientôt', 
        color: 'bg-yellow-500 text-white',
        progressColor: 'bg-yellow-500'
      };
    }
    return { 
      status: 'active', 
      label: 'En cours', 
      color: 'bg-primary text-primary-foreground',
      progressColor: 'bg-primary'
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Objectifs de planification
        </CardTitle>
        <CardDescription>
          Timeline des {sortedObjectives.length} objectif{sortedObjectives.length > 1 ? 's' : ''} en cours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Ligne verticale de la timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {sortedObjectives.map((objective, index) => {
              const statusInfo = getStatusInfo(objective);
              const timeProgress = getTimeProgress(objective);
              const deadline = new Date(objective.deadline);
              const daysRemaining = differenceInDays(deadline, new Date());
              
              return (
                <div key={objective.id} className="relative pl-10">
                  {/* Point sur la timeline */}
                  <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-background ${statusInfo.progressColor} flex items-center justify-center`}>
                    {statusInfo.status === 'expired' ? (
                      <AlertCircle className="h-3 w-3 text-white" />
                    ) : statusInfo.status === 'active' ? (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    ) : (
                      <Clock className="h-3 w-3 text-white" />
                    )}
                  </div>
                  
                  <Card className={`border-l-4 ${
                    statusInfo.status === 'expired' ? 'border-l-destructive' :
                    statusInfo.status === 'urgent' ? 'border-l-orange-500' :
                    statusInfo.status === 'soon' ? 'border-l-yellow-500' :
                    'border-l-primary'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            <Badge variant="outline">
                              {objective.objective_type === 'certification' 
                                ? `Certification Niv.${objective.target_certification_level}` 
                                : `Progression ${objective.target_progression_percentage}%`
                              }
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {objective.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {objective.city}
                              </span>
                            )}
                            {objective.school && (
                              <span className="flex items-center gap-1">
                                <School className="h-4 w-4" />
                                {objective.school}
                              </span>
                            )}
                            {objective.class_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {objective.class_name}
                              </span>
                            )}
                          </div>
                          
                          {objective.description && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              {objective.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium">
                            {format(deadline, 'dd MMM yyyy', { locale: fr })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isPast(deadline) 
                              ? 'Délai dépassé' 
                              : daysRemaining === 0 
                                ? "Aujourd'hui" 
                                : `Dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`
                            }
                          </div>
                        </div>
                      </div>
                      
                      {/* Barre de progression temporelle */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progression temporelle</span>
                          <span>{Math.round(timeProgress)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${statusInfo.progressColor}`}
                            style={{ width: `${timeProgress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
