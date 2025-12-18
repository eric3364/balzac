import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PlanningObjective {
  id: string;
  school: string;
  class_name: string | null;
  objective_type: 'certification' | 'progression';
  target_certification_level: number | null;
  target_progression_percentage: number | null;
  deadline: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const usePlanningObjectives = () => {
  const [objectives, setObjectives] = useState<PlanningObjective[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObjectives = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planning_objectives')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) throw error;
      setObjectives((data || []) as PlanningObjective[]);
    } catch (error) {
      console.error('Error fetching planning objectives:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  return { objectives, loading, refetch: fetchObjectives };
};

// Hook pour récupérer les objectifs applicables à l'utilisateur courant
export const useUserPlanningObjectives = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<PlanningObjective[]>([]);
  const [userSchool, setUserSchool] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserAndObjectives = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Récupérer les infos de l'utilisateur (école et classe)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('school, class_name')
        .eq('user_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        setLoading(false);
        return;
      }

      setUserSchool(userData?.school || null);
      setUserClass(userData?.class_name || null);

      if (!userData?.school) {
        setLoading(false);
        return;
      }

      // Récupérer les objectifs pour cette école/classe
      let query = supabase
        .from('planning_objectives')
        .select('*')
        .eq('is_active', true)
        .eq('school', userData.school)
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      const { data: objectivesData, error: objectivesError } = await query;

      if (objectivesError) throw objectivesError;

      // Filtrer les objectifs applicables (même classe ou pas de classe spécifiée)
      const applicableObjectives = (objectivesData || []).filter((obj: any) => {
        return obj.class_name === null || obj.class_name === userData.class_name;
      });

      setObjectives(applicableObjectives as PlanningObjective[]);
    } catch (error) {
      console.error('Error fetching user planning objectives:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserAndObjectives();
  }, [fetchUserAndObjectives]);

  return { objectives, userSchool, userClass, loading, refetch: fetchUserAndObjectives };
};
