import { useState, useEffect, useCallback } from 'react';
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

  // Set up real-time subscription for updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Test session updated, refreshing stats');
          fetchUserStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_attempts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Question attempt updated, refreshing stats');
          fetchUserStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_certifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Certification updated, refreshing stats');
          fetchUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    
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
        console.log('Sessions data:', sessions);
        const safeSessions = Array.isArray(sessions) ? sessions : [];
        const validSessions = safeSessions.filter(session => {
          // Ne pas compter les sessions supprimées
          if (session.deleted_at) {
            console.log('Ignoring deleted session:', session.id);
            return false;
          }
          // Ne compter que les sessions complétées
          if (session.status !== 'completed') {
            console.log('Ignoring non-completed session:', session.id, session.status);
            return false;
          }
          // Vérifier que les dates sont valides
          if (!session.started_at || !session.ended_at) {
            console.log('Ignoring session with missing dates:', session.id);
            return false;
          }
          return true;
        }) || [];

        console.log('Valid sessions for time calculation:', validSessions);

        const timeSpent = validSessions.reduce((total, session) => {
          console.log('Processing session:', session.id);
          if (!session.started_at || !session.ended_at) return total;
          const start = new Date(session.started_at);
          const end = new Date(session.ended_at);
          const sessionDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // en minutes
          console.log('Session duration:', sessionDuration, 'minutes for session', session.id);
          
          // Ignorer les sessions anormalement longues (plus de 8 heures = 480 minutes) ou négatives
          if (sessionDuration > 0 && sessionDuration <= 480) {
            console.log('Adding duration to total:', sessionDuration);
            return total + sessionDuration;
          } else {
            console.log('Ignoring invalid duration:', sessionDuration, 'for session', session.id);
          }
          return total;
        }, 0);

        console.log('Total time spent:', timeSpent, 'minutes');

        const safeAttempts = Array.isArray(attempts) ? attempts : [];
        // Compter uniquement les sessions complétées
        const totalTests = validSessions.length;
        const totalQuestions = safeAttempts.length;
        const correctAnswers = safeAttempts.filter(attempt => attempt.is_correct).length;
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUserStats();
  }, [user, fetchUserStats]);

  return { ...stats, refetchStats: fetchUserStats };
};