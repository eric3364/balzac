import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  totalTests: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  progressPercentage: number;
  certificationsCount: number;
  currentLevel: number;
  maxLevel: number;
  timeSpent: number; // en minutes
  loading: boolean;
}

export const useUserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTests: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    progressPercentage: 0,
    certificationsCount: 0,
    currentLevel: 1,
    maxLevel: 1,
    timeSpent: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));

        // Récupérer les tentatives de questions
        const { data: attempts } = await supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id);

        // Récupérer les sessions de test
        const { data: sessions } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('user_id', user.id);

        // Récupérer les certifications
        const { data: certifications } = await supabase
          .from('user_certifications')
          .select('*')
          .eq('user_id', user.id);

        // Récupérer le niveau maximum atteint
        const { data: maxLevelData } = await supabase
          .rpc('get_user_max_level', { user_uuid: user.id });

        // Calculer le temps total passé uniquement sur les tests complétés
        const timeSpent = sessions?.reduce((total, session) => {
          // Ne compter que les sessions complétées avec des dates valides
          if (session.started_at && session.ended_at && session.status === 'completed') {
            const start = new Date(session.started_at);
            const end = new Date(session.ended_at);
            const sessionDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // en minutes
            // Ignorer les sessions anormalement longues (plus de 8 heures = 480 minutes)
            if (sessionDuration > 0 && sessionDuration <= 480) {
              return total + sessionDuration;
            }
          }
          return total;
        }, 0) || 0;

        const totalTests = sessions?.length || 0;
        const totalQuestions = attempts?.length || 0;
        const correctAnswers = attempts?.filter(attempt => attempt.is_correct).length || 0;
        const incorrectAnswers = totalQuestions - correctAnswers;
        const progressPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const certificationsCount = certifications?.length || 0;
        const maxLevel = maxLevelData || 1;

        setStats({
          totalTests,
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          progressPercentage,
          certificationsCount,
          currentLevel: maxLevel,
          maxLevel,
          timeSpent,
          loading: false,
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchUserStats();
  }, [user]);

  return stats;
};