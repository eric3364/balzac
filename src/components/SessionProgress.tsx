import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Lock, RefreshCw } from 'lucide-react';

interface SessionInfo {
  sessionNumber: number;
  sessionType: 'regular' | 'remedial';
  questionsCount: number;
  isAvailable: boolean;
}

interface SessionProgress {
  level: number;
  currentSessionNumber: number;
  totalSessionsForLevel: number;
  completedSessions: number;
  isLevelCompleted: boolean;
  failedQuestionsCount: number;
}

interface SessionProgressProps {
  progress: SessionProgress;
  availableSessions: SessionInfo[];
  onStartSession: (sessionNumber: number, sessionType: 'regular' | 'remedial') => void;
  loading?: boolean;
}

export const SessionProgressComponent: React.FC<SessionProgressProps> = ({
  progress,
  availableSessions,
  onStartSession,
  loading = false
}) => {
  const formatSessionNumber = (sessionNumber: number) => {
    if (sessionNumber >= 99) {
      return `${Math.floor(sessionNumber)}.R`; // Session de rattrapage
    }
    return sessionNumber.toFixed(1);
  };

  const getSessionStatus = (session: SessionInfo) => {
    if (!session.isAvailable) {
      return 'locked';
    }
    
    if (session.sessionNumber < progress.currentSessionNumber) {
      return 'completed';
    }
    
    if (session.sessionNumber === progress.currentSessionNumber) {
      return 'current';
    }
    
    return 'available';
  };

  const getProgressPercentage = () => {
    if (progress.isLevelCompleted) return 100;
    return Math.round((progress.completedSessions / progress.totalSessionsForLevel) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'locked':
        return <Lock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'current':
        return 'default';
      case 'locked':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progression du niveau {progress.level}</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte de progression générale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Niveau {progress.level}</span>
            {progress.isLevelCompleted && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Niveau validé
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Sessions complétées : {progress.completedSessions} / {progress.totalSessionsForLevel}
            {progress.failedQuestionsCount > 0 && (
              <span className="text-orange-600 ml-2">
                • {progress.failedQuestionsCount} question(s) à réviser
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions disponibles</CardTitle>
          <CardDescription>
            Cliquez sur une session pour commencer. Vous devez obtenir 75% minimum pour valider une session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {availableSessions.map((session) => {
              const status = getSessionStatus(session);
              const isDisabled = status === 'locked' || loading;

              return (
                <div
                  key={session.sessionNumber}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          Session {formatSessionNumber(session.sessionNumber)}
                        </span>
                        {session.sessionType === 'remedial' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Rattrapage
                          </Badge>
                        )}
                        <Badge variant={getStatusVariant(status)}>
                          {status === 'completed' ? 'Complétée' :
                           status === 'current' ? 'En cours' :
                           status === 'locked' ? 'Verrouillée' : 'Disponible'}
                        </Badge>
                      </div>
                      {session.sessionType === 'remedial' ? (
                        <p className="text-sm text-muted-foreground">
                          {session.questionsCount} question(s) échouée(s) à réviser
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Session régulière du niveau {progress.level}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={status === 'current' ? 'default' : 'outline'}
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => onStartSession(session.sessionNumber, session.sessionType)}
                  >
                    {status === 'completed' ? 'Revoir' :
                     status === 'current' ? 'Continuer' : 'Commencer'}
                  </Button>
                </div>
              );
            })}
          </div>

          {availableSessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune session disponible pour ce niveau.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};