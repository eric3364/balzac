import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Trophy, Shield, Crown, Clock } from 'lucide-react';
import CertificationBadge from './CertificationBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Certification {
  id: string;
  level: number;
  score: number;
  certified_at: string | null;
  timeSpent?: number; // en minutes
}

interface CertificateTemplate {
  id: string;
  name: string;
  certificate_title: string;
  badge_icon: string | null;
  badge_color: string | null;
  badge_background_color: string | null;
  badge_size?: string | null;
  custom_badge_url?: string | null;
  difficulty_level_id: string;
  difficulty_levels: {
    level_number: number;
    name: string;
    color: string | null;
  };
}

const CertificationBadges = () => {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Récupérer les certifications de l'utilisateur
        const { data: userCertifications } = await supabase
          .from('user_certifications')
          .select('*')
          .eq('user_id', user.id)
          .order('level', { ascending: true });

        // Récupérer les sessions de test pour calculer le temps par niveau
        const { data: sessions } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('user_id', user.id);

        // Récupérer les niveaux de difficulté actifs
        const { data: difficultyLevels } = await supabase
          .from('difficulty_levels')
          .select('*')
          .eq('is_active', true)
          .order('level_number', { ascending: true });

        // Récupérer les modèles de certificats avec les niveaux de difficulté
        const { data: certificateTemplates } = await supabase
          .from('certificate_templates')
          .select(`
            *,
            difficulty_levels (
              level_number,
              name,
              color
            )
          `);

        // Calculer le temps passé par niveau
        const certificationsWithTime = (userCertifications || []).map(cert => {
          const levelSessions = sessions?.filter(session => {
            // Ne considérer que les sessions complétées pour ce niveau
            return session.current_level === cert.level && 
                   session.status === 'completed' &&
                   session.started_at && 
                   session.ended_at &&
                   !session.deleted_at;
          }) || [];

          const timeSpent = levelSessions.reduce((total, session) => {
            if (!session.started_at || !session.ended_at) return total;
            const start = new Date(session.started_at);
            const end = new Date(session.ended_at);
            const sessionDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            
            // Valider la durée (entre 0 et 480 minutes)
            if (sessionDuration > 0 && sessionDuration <= 480) {
              return total + sessionDuration;
            }
            return total;
          }, 0);

          return {
            ...cert,
            timeSpent
          };
        });

        setCertifications(certificationsWithTime.filter(cert => cert.certified_at));
        setTemplates((certificateTemplates || []).map(template => ({
          ...template,
          badge_icon: template.badge_icon || 'award',
          badge_color: template.badge_color || '#6366f1',
          badge_background_color: template.badge_background_color || '#ffffff',
          difficulty_levels: {
            ...template.difficulty_levels,
            color: template.difficulty_levels?.color || '#6366f1'
          }
        })));
        setDifficultyLevels(difficultyLevels || []);
      } catch (error) {
        console.error('Erreur lors du chargement des certifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'award': return Award;
      case 'star': return Star;
      case 'trophy': return Trophy;
      case 'shield': return Shield;
      case 'crown': return Crown;
      default: return Award;
    }
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return 'Élémentaire';
      case 2: return 'Intermédiaire';
      case 3: return 'Avancé';
      case 4: return 'Expert';
      case 5: return 'Maître';
      default: return `Niveau ${level}`;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const formatStudyTime = (minutes: number) => {
    if (minutes === 0) return 'Aucun temps';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-48 mb-4"></div>
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-24 h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Créer une liste de tous les niveaux configurés avec le statut obtenu/non obtenu
  const allLevels = difficultyLevels.map(diffLevel => {
    const certification = certifications.find(cert => cert.level === diffLevel.level_number);
    const template = templates.find(t => t.difficulty_levels?.level_number === diffLevel.level_number);
    
    return {
      level: diffLevel.level_number,
      difficultyLevel: diffLevel,
      certification,
      template,
      isObtained: !!certification
    };
  });

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Mes Certifications</h2>
          <Badge variant="secondary" className="ml-2">
            {certifications.length} / {difficultyLevels.length} obtenue{certifications.length > 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allLevels.map((levelData) => {
            const { level, difficultyLevel, certification, template, isObtained } = levelData;
            const IconComponent = getIconComponent(template?.badge_icon || 'award');
            const badgeColor = template?.badge_color || '#6366f1';
            const backgroundColor = template?.badge_background_color || '#ffffff';
            
            return (
              <div
                key={level}
                className={`flex flex-col items-center p-4 rounded-lg border transition-all duration-200 ${
                  isObtained 
                    ? 'bg-card hover:shadow-lg' 
                    : 'bg-muted/50 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Badge avec nouveau composant */}
                <div className="mb-3">
                  <CertificationBadge
                    icon={template?.badge_icon || 'award'}
                    color={badgeColor}
                    backgroundColor={backgroundColor}
                    size={template?.badge_size === 'small' ? 'small' : template?.badge_size === 'large' ? 'large' : 'medium'}
                    isObtained={isObtained}
                    level={level}
                    animated={true}
                    customUrl={template?.custom_badge_url || undefined}
                  />
                </div>

                {/* Level Name */}
<h3 className={`font-semibold text-sm text-center mb-1 ${
                  isObtained ? '' : 'text-muted-foreground'
                }`}>
                  {difficultyLevel.name}
                </h3>

                {isObtained && certification ? (
                  <>
                    {/* Score */}
                    <div className={`text-lg font-bold mb-2 ${getScoreColor(certification.score)}`}>
                      {certification.score}%
                    </div>

                    {/* Study Time */}
                    <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatStudyTime(certification.timeSpent || 0)}</span>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground text-center">
                      {certification.certified_at && format(new Date(certification.certified_at), 'dd MMM yyyy', { locale: fr })}
                    </div>

                    {/* Perfect Score Indicator */}
                    {certification.score === 100 && (
                      <div className="mt-2">
                        <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                          <Star className="h-3 w-3 mr-1" />
                          Parfait !
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Non obtained status */}
                    <div className="text-sm font-medium mb-2 text-muted-foreground">
                      À débloquer
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {level === 1 ? 'Commencez votre apprentissage' : `Complétez le niveau ${level - 1} d'abord`}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificationBadges;