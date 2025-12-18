import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStats {
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  weeklyAvgConnectionTime: number; // en minutes
  monthlyAvgConnectionTime: number; // en minutes
  loading: boolean;
}

export const useConnectionStats = () => {
  const [stats, setStats] = useState<ConnectionStats>({
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    weeklyAvgConnectionTime: 0,
    monthlyAvgConnectionTime: 0,
    loading: true,
  });

  const fetchConnectionStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Début de la semaine (dimanche)
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Récupérer les sessions de la semaine courante
      const { data: weeklySessions } = await supabase
        .from('test_sessions')
        .select('user_id, started_at, ended_at, status')
        .gte('started_at', weekStart.toISOString())
        .eq('status', 'completed')
        .is('deleted_at', null);

      // Récupérer les sessions du mois courant
      const { data: monthlySessions } = await supabase
        .from('test_sessions')
        .select('user_id, started_at, ended_at, status')
        .gte('started_at', monthStart.toISOString())
        .eq('status', 'completed')
        .is('deleted_at', null);

      // Calculer les utilisateurs uniques de la semaine
      const weeklyUniqueUsers = new Set(
        (weeklySessions || []).map(session => session.user_id)
      ).size;

      // Calculer les utilisateurs uniques du mois
      const monthlyUniqueUsers = new Set(
        (monthlySessions || []).map(session => session.user_id)
      ).size;

      // Calculer le temps moyen de connexion pour la semaine
      const weeklyValidSessions = (weeklySessions || []).filter(session => {
        if (!session.started_at || !session.ended_at) return false;
        const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
        const durationMinutes = duration / (1000 * 60);
        return durationMinutes > 0 && durationMinutes <= 480; // Entre 0 et 8 heures
      });

      const weeklyTotalTime = weeklyValidSessions.reduce((total, session) => {
        const duration = new Date(session.ended_at!).getTime() - new Date(session.started_at!).getTime();
        return total + (duration / (1000 * 60)); // Convertir en minutes
      }, 0);

      const weeklyAvgTime = weeklyValidSessions.length > 0 
        ? Math.round(weeklyTotalTime / weeklyValidSessions.length) 
        : 0;

      // Calculer le temps moyen de connexion pour le mois
      const monthlyValidSessions = (monthlySessions || []).filter(session => {
        if (!session.started_at || !session.ended_at) return false;
        const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
        const durationMinutes = duration / (1000 * 60);
        return durationMinutes > 0 && durationMinutes <= 480; // Entre 0 et 8 heures
      });

      const monthlyTotalTime = monthlyValidSessions.reduce((total, session) => {
        const duration = new Date(session.ended_at!).getTime() - new Date(session.started_at!).getTime();
        return total + (duration / (1000 * 60)); // Convertir en minutes
      }, 0);

      const monthlyAvgTime = monthlyValidSessions.length > 0 
        ? Math.round(monthlyTotalTime / monthlyValidSessions.length) 
        : 0;

      setStats({
        weeklyActiveUsers: weeklyUniqueUsers,
        monthlyActiveUsers: monthlyUniqueUsers,
        weeklyAvgConnectionTime: weeklyAvgTime,
        monthlyAvgConnectionTime: monthlyAvgTime,
        loading: false,
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de connexion:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchConnectionStats();
  }, [fetchConnectionStats]);

  return { ...stats, refetchStats: fetchConnectionStats };
};