import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanningObjective {
  id: string;
  school: string | null;
  class_name: string | null;
  city: string | null;
  objective_type: string;
  target_certification_level: number | null;
  target_progression_percentage: number | null;
  deadline: string;
  is_active: boolean;
  created_at: string;
}

export interface UserObjectiveStatus {
  hasObjective: boolean;
  status: 'ahead' | 'on-track' | 'behind' | null;
  userProgress: number;
  expectedProgress: number;
}

export const useUserObjectiveStatus = () => {
  const [objectives, setObjectives] = useState<PlanningObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const { data, error } = await supabase
          .from('planning_objectives')
          .select('*')
          .eq('is_active', true)
          .gte('deadline', new Date().toISOString());

        if (error) throw error;
        setObjectives((data || []) as PlanningObjective[]);
      } catch (error) {
        console.error('Error fetching objectives:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchObjectives();
  }, []);

  const getUserObjectiveStatus = useCallback(async (
    userId: string,
    school: string | null,
    className: string | null,
    city: string | null
  ): Promise<UserObjectiveStatus> => {
    // Trouver un objectif applicable à cet utilisateur
    const applicableObjective = objectives.find(obj => {
      const schoolMatch = obj.school === null || obj.school === school;
      const classMatch = obj.class_name === null || obj.class_name === className;
      const cityMatch = obj.city === null || obj.city === city;
      return schoolMatch && classMatch && cityMatch && (school || className || city);
    });

    if (!applicableObjective) {
      return { hasObjective: false, status: null, userProgress: 0, expectedProgress: 0 };
    }

    // Calculer la progression temporelle attendue
    const now = new Date();
    const deadline = new Date(applicableObjective.deadline);
    const created = new Date(applicableObjective.created_at);
    const totalDuration = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    // Calculer la progression réelle de l'utilisateur
    let userProgress = 0;

    try {
      if (applicableObjective.objective_type === 'certification') {
        const targetLevel = applicableObjective.target_certification_level || 1;
        
        const { data: certData } = await supabase
          .from('user_certifications')
          .select('level')
          .eq('user_id', userId)
          .gte('level', targetLevel)
          .limit(1);

        if (certData && certData.length > 0) {
          userProgress = 100;
        } else {
          // Vérifier la progression vers le niveau cible
          const { data: sessionData } = await supabase
            .from('session_progress')
            .select('completed_sessions, total_sessions_for_level')
            .eq('user_id', userId)
            .eq('level', targetLevel)
            .single();

          if (sessionData) {
            const completed = sessionData.completed_sessions || 0;
            const total = sessionData.total_sessions_for_level || 5;
            userProgress = (completed / total) * 100;
          }
        }
      } else if (applicableObjective.objective_type === 'progression') {
        const targetPercentage = applicableObjective.target_progression_percentage || 100;
        
        const { data: sessionData } = await supabase
          .from('session_progress')
          .select('completed_sessions, total_sessions_for_level')
          .eq('user_id', userId);

        if (sessionData && sessionData.length > 0) {
          const totalCompleted = sessionData.reduce((sum, s) => sum + (s.completed_sessions || 0), 0);
          const totalSessions = sessionData.reduce((sum, s) => sum + (s.total_sessions_for_level || 5), 0);
          const currentPercentage = totalSessions > 0 ? (totalCompleted / totalSessions) * 100 : 0;
          userProgress = (currentPercentage / targetPercentage) * 100;
        }
      }
    } catch (error) {
      console.error('Error calculating user progress:', error);
    }

    // Déterminer le statut
    const difference = userProgress - expectedProgress;
    let status: 'ahead' | 'on-track' | 'behind';
    
    if (difference > 10) {
      status = 'ahead';
    } else if (difference < -10) {
      status = 'behind';
    } else {
      status = 'on-track';
    }

    return { hasObjective: true, status, userProgress, expectedProgress };
  }, [objectives]);

  return { objectives, loading, getUserObjectiveStatus };
};
