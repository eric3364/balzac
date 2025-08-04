import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  totalQuestions: number;
  correctAnswers: number;
  progressPercentage: number;
  certificationsCount: number;
  currentLevel: number;
  maxLevel: number;
  loading: boolean;
}

export const useUserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    progressPercentage: 0,
    certificationsCount: 0,
    currentLevel: 1,
    maxLevel: 1,
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

        // Récupérer les certifications
        const { data: certifications } = await supabase
          .from('user_certifications')
          .select('*')
          .eq('user_id', user.id);

        // Récupérer le niveau maximum atteint
        const { data: maxLevelData } = await supabase
          .rpc('get_user_max_level', { user_uuid: user.id });

        const totalQuestions = attempts?.length || 0;
        const correctAnswers = attempts?.filter(attempt => attempt.is_correct).length || 0;
        const progressPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const certificationsCount = certifications?.length || 0;
        const maxLevel = maxLevelData || 1;

        setStats({
          totalQuestions,
          correctAnswers,
          progressPercentage,
          certificationsCount,
          currentLevel: maxLevel,
          maxLevel,
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