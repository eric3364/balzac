import { useState, useEffect } from 'react';
import { usePlanningObjectives, PlanningObjective } from '@/hooks/usePlanningObjectives';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Target, MapPin, School, Users, Clock, AlertCircle, UserCheck, Zap } from 'lucide-react';
import { format, isPast, differenceInDays, differenceInWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

// Taux de réussite estimé (90%)
const SUCCESS_RATE = 0.90;

interface Administrator {
  user_id: string;
  email: string;
}

interface StudentProgress {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  progress: number; // 0-100
  hasStarted: boolean;
}

interface ObjectiveStudentsData {
  [objectiveId: string]: StudentProgress[];
}

// Couleurs pour les pastilles d'étudiants
const STUDENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-emerald-500',
];

export const PlanningObjectivesTimeline = () => {
  const { objectives, loading } = usePlanningObjectives();
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [studentsData, setStudentsData] = useState<ObjectiveStudentsData>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [sessionsPerLevel, setSessionsPerLevel] = useState<Record<number, number>>({});

  // Charger le nombre de sessions par niveau
  useEffect(() => {
    const fetchSessionsPerLevel = async () => {
      const { data: configData } = await supabase
        .from('site_configuration')
        .select('config_key, config_value')
        .in('config_key', [
          'test_questions_percentage_level_1',
          'test_questions_percentage_level_2',
          'test_questions_percentage_level_3'
        ]);

      const sessionsCount: Record<number, number> = {};
      for (let level = 1; level <= 3; level++) {
        const configKey = `test_questions_percentage_level_${level}`;
        const config = (configData || []).find(c => c.config_key === configKey);
        const percentage = config ? Number(config.config_value) : 20;
        sessionsCount[level] = Math.ceil(100 / percentage);
      }
      setSessionsPerLevel(sessionsCount);
    };

    fetchSessionsPerLevel();
  }, []);

  // Calculer l'effort estimé pour un objectif
  const calculateWorkload = (objective: PlanningObjective) => {
    const now = new Date();
    const deadline = new Date(objective.deadline);
    
    if (isPast(deadline)) {
      return { sessionsPerWeek: 0, totalSessions: 0, weeksRemaining: 0, baseSessions: 0 };
    }
    
    const weeksRemaining = Math.max(1, differenceInWeeks(deadline, now) || 1);
    
    let baseSessions = 0;
    
    if (objective.objective_type === 'certification') {
      const level = objective.target_certification_level || 1;
      baseSessions = sessionsPerLevel[level] || 5;
    } else {
      const progressTarget = objective.target_progression_percentage || 100;
      const allSessions = Object.values(sessionsPerLevel).reduce((sum, count) => sum + count, 0);
      baseSessions = Math.round((progressTarget / 100) * allSessions);
    }
    
    const totalSessions = Math.ceil(baseSessions / SUCCESS_RATE);
    const sessionsPerWeek = totalSessions > 0 ? Math.ceil(totalSessions / weeksRemaining) : 0;
    
    return { sessionsPerWeek, totalSessions, weeksRemaining, baseSessions };
  };

  // Charger les administrateurs
  useEffect(() => {
    const fetchAdministrators = async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('user_id, email')
        .not('user_id', 'is', null);
      
      if (!error && data) {
        setAdministrators(data.filter((admin): admin is Administrator => admin.user_id !== null));
      }
    };

    fetchAdministrators();
  }, []);

  // Charger les étudiants et leur progression pour chaque objectif
  useEffect(() => {
    const fetchStudentsProgress = async () => {
      if (objectives.length === 0) {
        setLoadingStudents(false);
        return;
      }

      setLoadingStudents(true);
      const newStudentsData: ObjectiveStudentsData = {};

      for (const objective of objectives) {
        if (!objective.is_active) continue;

        // Construire la requête pour trouver les étudiants correspondants
        let query = supabase
          .from('users')
          .select('user_id, first_name, last_name, email, school, class_name, city');

        if (objective.city) {
          query = query.eq('city', objective.city);
        }
        if (objective.school) {
          query = query.eq('school', objective.school);
        }
        if (objective.class_name) {
          query = query.eq('class_name', objective.class_name);
        }

        const { data: students, error: studentsError } = await query;

        if (studentsError || !students) {
          console.error('Error fetching students:', studentsError);
          continue;
        }

        const studentProgressList: StudentProgress[] = [];

        for (const student of students) {
          if (!student.user_id) continue;

          let progress = 0;
          let hasStarted = false;

          if (objective.objective_type === 'certification') {
            // Vérifier si l'étudiant a obtenu la certification
            const { data: certData } = await supabase
              .from('user_certifications')
              .select('level')
              .eq('user_id', student.user_id)
              .gte('level', objective.target_certification_level || 1)
              .limit(1);

            if (certData && certData.length > 0) {
              progress = 100;
              hasStarted = true;
            } else {
              // Vérifier la progression dans les sessions
              const { data: sessionData } = await supabase
                .from('session_progress')
                .select('completed_sessions, total_sessions_for_level, level')
                .eq('user_id', student.user_id)
                .eq('level', objective.target_certification_level || 1)
                .limit(1);

              if (sessionData && sessionData.length > 0) {
                const sp = sessionData[0];
                const completed = sp.completed_sessions || 0;
                const total = sp.total_sessions_for_level || 5;
                progress = Math.min(100, (completed / total) * 100);
                hasStarted = completed > 0;
              }
            }
          } else {
            // Objectif de progression
            const { data: sessionData } = await supabase
              .from('session_progress')
              .select('completed_sessions, total_sessions_for_level')
              .eq('user_id', student.user_id);

            if (sessionData && sessionData.length > 0) {
              const totalCompleted = sessionData.reduce((acc, s) => acc + (s.completed_sessions || 0), 0);
              const totalSessions = sessionData.reduce((acc, s) => acc + (s.total_sessions_for_level || 5), 0);
              progress = totalSessions > 0 ? Math.min(100, (totalCompleted / totalSessions) * 100) : 0;
              hasStarted = totalCompleted > 0;
            }
          }

          studentProgressList.push({
            user_id: student.user_id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            progress,
            hasStarted
          });
        }

        newStudentsData[objective.id] = studentProgressList;
      }

      setStudentsData(newStudentsData);
      setLoadingStudents(false);
    };

    if (!loading) {
      fetchStudentsProgress();
    }
  }, [objectives, loading]);

  const getAdminEmail = (adminId: string | null) => {
    if (!adminId) return null;
    const admin = administrators.find(a => a.user_id === adminId);
    return admin?.email || null;
  };

  const getAverageProgress = (objectiveId: string) => {
    const students = studentsData[objectiveId] || [];
    const startedStudents = students.filter(s => s.hasStarted);
    if (startedStudents.length === 0) return 0;
    return startedStudents.reduce((acc, s) => acc + s.progress, 0) / startedStudents.length;
  };

  const getStudentColor = (index: number) => {
    return STUDENT_COLORS[index % STUDENT_COLORS.length];
  };

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
    <TooltipProvider>
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
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {sortedObjectives.map((objective) => {
                const statusInfo = getStatusInfo(objective);
                const timeProgress = getTimeProgress(objective);
                const deadline = new Date(objective.deadline);
                const daysRemaining = differenceInDays(deadline, new Date());
                const students = studentsData[objective.id] || [];
                const startedStudents = students.filter(s => s.hasStarted);
                const averageProgress = getAverageProgress(objective.id);
                const workload = calculateWorkload(objective);
                const weeksRemaining = workload.weeksRemaining;
                
                return (
                  <div key={objective.id} className="relative pl-10">
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
                              <Badge variant="secondary" className="text-xs">
                                {students.length} étudiant{students.length > 1 ? 's' : ''}
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
                          
                          <div className="text-right ml-4 flex-shrink-0">
                            {objective.reference_admin_id && getAdminEmail(objective.reference_admin_id) && (
                              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mb-1">
                                <UserCheck className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">
                                  {getAdminEmail(objective.reference_admin_id)}
                                </span>
                              </div>
                            )}
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

                        {/* Pastilles des étudiants ayant démarré */}
                        {startedStudents.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-xs text-muted-foreground">
                                Étudiants actifs ({startedStudents.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {startedStudents.map((student, index) => {
                                const studentName = student.first_name && student.last_name 
                                  ? `${student.first_name} ${student.last_name}` 
                                  : student.email;
                                const isAhead = student.progress > averageProgress;
                                const isBehind = student.progress < averageProgress;
                                
                                return (
                                  <Tooltip key={student.user_id}>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`w-6 h-6 rounded-full ${getStudentColor(index)} cursor-pointer flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-125 ring-2 ${
                                          isAhead ? 'ring-green-400' : isBehind ? 'ring-red-400' : 'ring-transparent'
                                        }`}
                                      >
                                        {(student.first_name?.[0] || student.email[0]).toUpperCase()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div className="space-y-1">
                                        <p className="font-medium">{studentName}</p>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full ${getStudentColor(index)}`}
                                              style={{ width: `${student.progress}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium">{Math.round(student.progress)}%</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          {isAhead ? '✓ En avance sur la moyenne' : isBehind ? '⚠ En retard sur la moyenne' : '= Dans la moyenne'}
                                        </p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Barre de progression moyenne du groupe */}
                        {students.length > 0 && (
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progression moyenne du groupe</span>
                              <span>{Math.round(averageProgress)}%</span>
                            </div>
                            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                              {/* Barre de progression moyenne */}
                              <div 
                                className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${averageProgress}%` }}
                              />
                              {/* Indicateur de position moyenne */}
                              <div 
                                className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-500"
                                style={{ left: `${Math.max(0, averageProgress - 0.5)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Effort estimé */}
                        {workload.totalSessions > 0 && !isPast(deadline) && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10 mb-3">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Effort estimé:</span>
                            <Badge variant="outline" className="text-xs">
                              {workload.sessionsPerWeek} session{workload.sessionsPerWeek > 1 ? 's' : ''}/semaine
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({workload.totalSessions} sessions sur {weeksRemaining} semaine{weeksRemaining > 1 ? 's' : ''})
                            </span>
                          </div>
                        )}

                        {/* Barre de progression temporelle avec marqueurs de semaines */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progression temporelle</span>
                            <span>{Math.round(timeProgress)}%</span>
                          </div>
                          {(() => {
                            // Calculer le nombre total de semaines depuis la création jusqu'à l'échéance
                            const created = new Date(objective.created_at);
                            const totalWeeks = Math.max(1, Math.ceil(differenceInDays(deadline, created) / 7));
                            const elapsedWeeks = Math.floor((timeProgress / 100) * totalWeeks);
                            
                            return (
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
                            );
                          })()}
                          
                          {/* Légende des semaines */}
                          {(() => {
                            const created = new Date(objective.created_at);
                            const totalWeeks = Math.max(1, Math.ceil(differenceInDays(deadline, created) / 7));
                            const elapsedWeeks = Math.floor((timeProgress / 100) * totalWeeks);
                            const remainingWeeks = totalWeeks - elapsedWeeks;
                            
                            return totalWeeks > 1 ? (
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                                  {elapsedWeeks} semaine{elapsedWeeks > 1 ? 's' : ''} écoulée{elapsedWeeks > 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-secondary border border-border"></span>
                                  {remainingWeeks} semaine{remainingWeeks > 1 ? 's' : ''} restante{remainingWeeks > 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : null;
                          })()}
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
    </TooltipProvider>
  );
};
