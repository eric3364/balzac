import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ProgressChartProps {
  correctAnswers: number;
  incorrectAnswers: number;
  loading?: boolean;
}

const ProgressChart = ({ correctAnswers, incorrectAnswers, loading }: ProgressChartProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des réponses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const total = correctAnswers + incorrectAnswers;
  
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des réponses</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

  const data = [
    {
      name: 'Réponses correctes',
      value: correctAnswers,
      percentage: Math.round((correctAnswers / total) * 100),
    },
    {
      name: 'Réponses incorrectes',
      value: incorrectAnswers,
      percentage: Math.round((incorrectAnswers / total) * 100),
    },
  ];

  const COLORS = ['hsl(142 76% 36%)', 'hsl(var(--destructive))'];

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des réponses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{correctAnswers}</p>
            <p className="text-sm text-muted-foreground">Correctes</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{incorrectAnswers}</p>
            <p className="text-sm text-muted-foreground">Incorrectes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressChart;