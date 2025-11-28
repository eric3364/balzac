import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserCertification {
  level: number;
  score: number;
  certified_at: string | null;
}

export interface UserListStats {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  class_name: string | null;
  is_active: boolean;
  created_at: string | null;
  total_tests: number;
  total_questions: number;
  correct_answers: number;
  certifications_count: number;
  certifications: UserCertification[];
  max_level: number;
  avg_score: number;
  time_spent_minutes: number;
  last_activity: string | null;
}

export const useUserListStats = () => {
  const [users, setUsers] = useState<UserListStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsersWithStats = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer tous les utilisateurs
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const usersWithStats: UserListStats[] = [];

      for (const user of usersData || []) {
        if (!user.user_id) {
          // Utilisateur sans compte auth, ajouter avec stats vides
          usersWithStats.push({
            user_id: user.user_id || '',
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            school: user.school,
            class_name: user.class_name,
            is_active: user.is_active || false,
            created_at: user.created_at || '',
            total_tests: 0,
            total_questions: 0,
            correct_answers: 0,
            certifications_count: 0,
            certifications: [],
            max_level: 0,
            avg_score: 0,
            time_spent_minutes: 0,
            last_activity: null
          });
          continue;
        }

        // Récupérer les statistiques pour cet utilisateur
        const [
          { data: sessionsData },
          { data: attemptsData },
          { data: certificationsData },
          { data: maxLevelData }
        ] = await Promise.all([
          supabase
            .from('test_sessions')
            .select('score, started_at, ended_at')
            .eq('user_id', user.user_id)
            .eq('status', 'completed'),
          supabase
            .from('question_attempts')
            .select('is_correct')
            .eq('user_id', user.user_id),
            supabase
              .from('user_certifications')
              .select('level, score, certified_at')
              .eq('user_id', user.user_id)
              .order('certified_at', { ascending: false }),
          supabase.rpc('get_user_max_level', { user_uuid: user.user_id })
        ]);

        // Sécuriser les données
        const safeSessions = Array.isArray(sessionsData) ? sessionsData : [];
        const safeAttempts = Array.isArray(attemptsData) ? attemptsData : [];
        const safeCertifications = Array.isArray(certificationsData) ? certificationsData : [];

        // Calculer les statistiques
        const totalTests = safeSessions.length;
        const totalQuestions = safeAttempts.length;
        const correctAnswers = safeAttempts.filter(a => a.is_correct).length;
        const certificationsCount = safeCertifications.length;
        const maxLevel = maxLevelData || 0;

        // Calculer le score moyen
        const avgScore = totalTests > 0 
          ? Math.round(safeSessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalTests)
          : 0;

        // Calculer le temps total en minutes
        const timeSpentMinutes = safeSessions.reduce((total, session) => {
          if (session.started_at && session.ended_at) {
            const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
            return total + Math.round(duration / (1000 * 60));
          }
          return total;
        }, 0);

        // Dernière activité
        const lastActivity = safeSessions.length > 0
          ? safeSessions[safeSessions.length - 1]?.started_at 
          : null;

        usersWithStats.push({
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          school: user.school,
          class_name: user.class_name,
          is_active: user.is_active || false,
          created_at: user.created_at || '',
          total_tests: totalTests,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          certifications_count: certificationsCount,
          certifications: safeCertifications.filter(cert => cert.certified_at).map(cert => ({
            level: cert.level,
            score: cert.score,
            certified_at: cert.certified_at!
          })),
          max_level: maxLevel,
          avg_score: avgScore,
          time_spent_minutes: timeSpentMinutes,
          last_activity: lastActivity
        });
      }

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques utilisateurs:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersWithStats();
  }, [fetchUsersWithStats]);

  return { users, loading, refetch: fetchUsersWithStats };
};