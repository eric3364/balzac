import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudyTimeChartProps {
  timeSpent: number; // en minutes
  sessionsCount: number;
  loading?: boolean;
}

interface WeeklyStudyData {
  name: string;
  minutes: number;
  sessions: number;
}

const StudyTimeChart = ({ timeSpent, sessionsCount, loading }: StudyTimeChartProps) => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyStudyData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!user) return;

      try {
        setDataLoading(true);
        
        // Calculer les dates pour les 7 derniers jours
        const today = new Date();
        const weeklyStats: WeeklyStudyData[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.setHours(0, 0, 0, 0));
          const endOfDay = new Date(date.setHours(23, 59, 59, 999));
          
          // Récupérer les sessions de ce jour
          const { data: sessions } = await supabase
            .from('test_sessions')
            .select('started_at, ended_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('started_at', startOfDay.toISOString())
            .lte('started_at', endOfDay.toISOString());

          // Calculer le temps total pour ce jour
          const dayMinutes = sessions?.reduce((total, session) => {
            if (session.started_at && session.ended_at) {
              const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
              return total + Math.round(duration / (1000 * 60));
            }
            return total;
          }, 0) || 0;

          const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          
          weeklyStats.push({
            name: dayNames[startOfDay.getDay()],
            minutes: dayMinutes,
            sessions: sessions?.length || 0
          });
        }
        
        setWeeklyData(weeklyStats);
      } catch (error) {
        console.error('Erreur lors du chargement des données hebdomadaires:', error);
        // Données de fallback en cas d'erreur
        setWeeklyData([
          { name: 'Lun', minutes: 0, sessions: 0 },
          { name: 'Mar', minutes: 0, sessions: 0 },
          { name: 'Mer', minutes: 0, sessions: 0 },
          { name: 'Jeu', minutes: 0, sessions: 0 },
          { name: 'Ven', minutes: 0, sessions: 0 },
          { name: 'Sam', minutes: 0, sessions: 0 },
          { name: 'Dim', minutes: 0, sessions: 0 },
        ]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchWeeklyData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Temps d'étude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hours = Math.floor(timeSpent / 60);
  const minutes = timeSpent % 60;
  const averageSessionTime = sessionsCount > 0 ? Math.round(timeSpent / sessionsCount) : 0;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Temps d'étude
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques principales */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {hours > 0 ? `${hours}h` : ''}{minutes > 0 ? ` ${minutes}min` : hours === 0 ? `${minutes}min` : ''}
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatTime(averageSessionTime)}</div>
            <div className="text-sm text-muted-foreground">Moyenne</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{sessionsCount}</div>
            <div className="text-sm text-muted-foreground">Sessions</div>
          </div>
        </div>

        {/* Graphique hebdomadaire */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Répartition hebdomadaire
          </h4>
          <div className="h-48">
            {dataLoading ? (
              <div className="h-full bg-muted animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${Math.round(value)}min`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'minutes' ? `${Math.round(value)}min` : value,
                      name === 'minutes' ? 'Temps d\'étude' : 'Sessions'
                    ]}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Objectifs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objectifs d'étude
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Objectif quotidien (30min)</span>
              <span className={`text-sm font-medium ${
                averageSessionTime >= 30 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {averageSessionTime >= 30 ? '✓ Atteint' : `${30 - averageSessionTime}min restantes`}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Objectif hebdomadaire (3h)</span>
              <span className={`text-sm font-medium ${
                timeSpent >= 180 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {timeSpent >= 180 ? '✓ Atteint' : `${formatTime(180 - timeSpent)} restantes`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimeChart;