import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ScoreGaugeProps {
  score: number;
  loading?: boolean;
}

const ScoreGauge = ({ score, loading }: ScoreGaugeProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score moyen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded-full" />
            <div className="h-4 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Bien';
    if (score >= 60) return 'Moyen';
    return 'À améliorer';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score moyen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          {/* Circular progress */}
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                className="text-muted stroke-current"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Progress circle */}
              <path
                className={`stroke-current ${
                  score >= 90 ? 'text-green-500' :
                  score >= 75 ? 'text-blue-500' :
                  score >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${score}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                  {score}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {getScoreLabel(score)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression</span>
            <span className={getScoreColor(score)}>{score}%</span>
          </div>
          <div className="relative">
            <Progress value={score} className="h-3" />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getProgressColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className={`p-3 rounded-lg ${
            score >= 75 ? 'bg-green-50 dark:bg-green-950' : 'bg-muted'
          }`}>
            <div className="text-lg font-bold">
              {score >= 75 ? '✓' : '○'}
            </div>
            <div className="text-xs text-muted-foreground">Objectif 75%</div>
          </div>
          <div className={`p-3 rounded-lg ${
            score >= 90 ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-muted'
          }`}>
            <div className="text-lg font-bold">
              {score >= 90 ? '⭐' : '○'}
            </div>
            <div className="text-xs text-muted-foreground">Excellence 90%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreGauge;