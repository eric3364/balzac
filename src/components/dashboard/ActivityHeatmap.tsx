import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ActivityHeatmapProps {
  totalQuestions: number;
  sessionsCount: number;
  loading?: boolean;
}

interface DayActivity {
  date: Date;
  activity: number;
  questions: number;
  sessions: number;
}

const ActivityHeatmap = ({ totalQuestions, sessionsCount, loading }: ActivityHeatmapProps) => {
  const { user } = useAuth();
  const [days, setDays] = useState<DayActivity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user) return;

      try {
        setDataLoading(true);
        
        const activityDays: DayActivity[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.setHours(0, 0, 0, 0));
          const endOfDay = new Date(date.setHours(23, 59, 59, 999));
          
          // Récupérer les sessions et tentatives de ce jour
          const [
            { data: sessions },
            { data: attempts }
          ] = await Promise.all([
            supabase
              .from('test_sessions')
              .select('id')
              .eq('user_id', user.id)
              .gte('started_at', startOfDay.toISOString())
              .lte('started_at', endOfDay.toISOString()),
            supabase
              .from('question_attempts')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', startOfDay.toISOString())
              .lte('created_at', endOfDay.toISOString())
          ]);

          const questionsCount = attempts?.length || 0;
          const sessionsCount = sessions?.length || 0;
          
          // Calculer le niveau d'activité (0-4)
          const activityLevel = 
            questionsCount === 0 ? 0 :
            questionsCount < 3 ? 1 :
            questionsCount < 7 ? 2 :
            questionsCount < 15 ? 3 : 4;

          activityDays.push({
            date: new Date(startOfDay),
            activity: activityLevel,
            questions: questionsCount,
            sessions: sessionsCount,
          });
        }
        
        setDays(activityDays);
      } catch (error) {
        console.error('Erreur lors du chargement des données d\'activité:', error);
        // Données de fallback en cas d'erreur
        const fallbackDays: DayActivity[] = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          fallbackDays.push({
            date,
            activity: 0,
            questions: 0,
            sessions: 0,
          });
        }
        setDays(fallbackDays);
      } finally {
        setDataLoading(false);
      }
    };

    fetchActivityData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const getActivityColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted';
      case 1: return 'bg-green-200 dark:bg-green-900';
      case 2: return 'bg-green-300 dark:bg-green-800';
      case 3: return 'bg-green-400 dark:bg-green-700';
      case 4: return 'bg-green-500 dark:bg-green-600';
      default: return 'bg-muted';
    }
  };

  const currentStreak = days.reverse().findIndex(day => day.activity === 0);
  const streakCount = currentStreak === -1 ? days.length : currentStreak;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques de streak */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-lg">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <div className="text-lg font-bold text-orange-600">{streakCount}</div>
              <div className="text-sm text-muted-foreground">
                {streakCount > 1 ? 'jours consécutifs' : 'jour d\'activité'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {streakCount >= 7 ? '🔥 Super série !' :
               streakCount >= 3 ? '⭐ Bonne série !' :
               streakCount >= 1 ? '✨ Continue !' : '💤 À réveiller'}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">30 derniers jours</div>
          {dataLoading ? (
            <div className="h-8 bg-muted animate-pulse rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-10 gap-1">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-sm ${getActivityColor(day.activity)} transition-all hover:scale-125`}
                    title={`${day.date.toLocaleDateString('fr-FR')} - ${day.questions} questions, ${day.sessions} sessions`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Moins</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`w-2 h-2 rounded-sm ${getActivityColor(level)}`}
                    />
                  ))}
                </div>
                <span>Plus</span>
              </div>
            </>
          )}
        </div>

        {/* Statistiques hebdomadaires */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {Math.round(totalQuestions / Math.max(1, Math.ceil(days.length / 7)))}
            </div>
            <div className="text-xs text-muted-foreground">Moy. hebdomadaire</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(sessionsCount / Math.max(1, Math.ceil(days.length / 7)))}
            </div>
            <div className="text-xs text-muted-foreground">Sessions/semaine</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;