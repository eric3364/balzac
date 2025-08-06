import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }: StatsCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
    green: 'bg-green-500/10 text-green-600 border-green-200',
    red: 'bg-red-500/10 text-red-600 border-red-200',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover-scale border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={`text-xs font-medium mt-2 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;