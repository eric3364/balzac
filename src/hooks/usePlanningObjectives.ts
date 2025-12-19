import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/hooks/useImpersonation';

export interface PlanningObjective {
  id: string;
  school: string;
  class_name: string | null;
  city: string | null;
  objective_type: 'certification' | 'progression';
  target_certification_level: number | null;
  target_progression_percentage: number | null;
  deadline: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  reference_admin_id: string | null;
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
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const [objectives, setObjectives] = useState<PlanningObjective[]>([]);
  const [userSchool, setUserSchool] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Utiliser l'ID de l'utilisateur impersonné si en mode impersonnation
  const effectiveUserId = isImpersonating && impersonatedUser ? impersonatedUser.user_id : user?.id;

  const fetchUserAndObjectives = useCallback(async () => {
    console.log('[useUserPlanningObjectives] Starting fetch', { 
      effectiveUserId, 
      isImpersonating, 
      impersonatedUser
    });
    
    if (!effectiveUserId) {
      console.log('[useUserPlanningObjectives] No effectiveUserId, returning');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let school: string | null = null;
      let className: string | null = null;
      
      // En mode impersonnation, utiliser directement les données stockées
      if (isImpersonating && impersonatedUser) {
        school = impersonatedUser.school;
        className = impersonatedUser.class_name;
        console.log('[useUserPlanningObjectives] Using impersonated user data:', { school, className });
      } else {
        // Récupérer les infos depuis la base
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('school, class_name')
          .eq('user_id', effectiveUserId)
          .single();

        console.log('[useUserPlanningObjectives] User data from DB:', userData, 'Error:', userError);

        if (userError) {
          console.error('Error fetching user data:', userError);
          setLoading(false);
          return;
        }
        
        school = userData?.school || null;
        className = userData?.class_name || null;
      }

      console.log('[useUserPlanningObjectives] School and class for objectives:', { school, className });
      setUserSchool(school);
      setUserClass(className);

      if (!school) {
        console.log('[useUserPlanningObjectives] No school, returning');
        setLoading(false);
        return;
      }

      console.log('[useUserPlanningObjectives] Fetching objectives for school:', school);

      // Récupérer les objectifs pour cette école/classe
      let query = supabase
        .from('planning_objectives')
        .select('*')
        .eq('is_active', true)
        .eq('school', school)
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      const { data: objectivesData, error: objectivesError } = await query;

      console.log('Objectives data:', objectivesData, 'Error:', objectivesError);

      if (objectivesError) throw objectivesError;

      // Filtrer les objectifs applicables (même classe ou pas de classe spécifiée)
      const applicableObjectives = (objectivesData || []).filter((obj: any) => {
        const matches = obj.class_name === null || obj.class_name === className;
        console.log('Objective', obj.id, 'class_name:', obj.class_name, 'user className:', className, 'matches:', matches);
        return matches;
      });

      console.log('Applicable objectives:', applicableObjectives);
      setObjectives(applicableObjectives as PlanningObjective[]);
    } catch (error) {
      console.error('Error fetching user planning objectives:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, isImpersonating, impersonatedUser]);

  useEffect(() => {
    fetchUserAndObjectives();
  }, [fetchUserAndObjectives]);

  return { objectives, userSchool, userClass, loading, refetch: fetchUserAndObjectives };
};
