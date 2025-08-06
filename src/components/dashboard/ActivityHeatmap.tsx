import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Flame } from 'lucide-react';

interface ActivityHeatmapProps {
  totalQuestions: number;
  sessionsCount: number;
  loading?: boolean;
}

const ActivityHeatmap = ({ totalQuestions, sessionsCount, loading }: ActivityHeatmapProps) => {
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

  // Générer les 30 derniers jours
  const days = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulation d'activité basée sur les données réelles
    const intensity = Math.random() * (totalQuestions / 30); // Répartition approximative
    const activityLevel = 
      intensity === 0 ? 0 :
      intensity < 2 ? 1 :
      intensity < 5 ? 2 :
      intensity < 8 ? 3 : 4;

    days.push({
      date,
      activity: activityLevel,
      questions: Math.round(intensity),
    });
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
          <div className="grid grid-cols-10 gap-1">
            {days.reverse().map((day, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-sm ${getActivityColor(day.activity)} transition-all hover:scale-125`}
                title={`${day.date.toLocaleDateString('fr-FR')} - ${day.questions} questions`}
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
        </div>

        {/* Statistiques hebdomadaires */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {Math.round(totalQuestions / 4)}
            </div>
            <div className="text-xs text-muted-foreground">Moy. hebdomadaire</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(sessionsCount / 4)}
            </div>
            <div className="text-xs text-muted-foreground">Sessions/semaine</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;