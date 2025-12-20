import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminPrivilege {
  id: string;
  privilege_key: string;
  privilege_label: string;
  is_enabled: boolean;
  description: string | null;
}

export const useAdminPrivileges = () => {
  const [privileges, setPrivileges] = useState<AdminPrivilege[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivileges();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('admin_privileges_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_privileges'
        },
        () => {
          loadPrivileges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPrivileges = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_privileges')
        .select('*');

      if (error) throw error;
      setPrivileges(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des privilèges:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPrivilege = (privilegeKey: string, isSuperAdmin: boolean): boolean => {
    // Les super admins ont toujours tous les privilèges
    if (isSuperAdmin) return true;
    
    const privilege = privileges.find(p => p.privilege_key === privilegeKey);
    return privilege?.is_enabled ?? false;
  };

  const canManageQuestions = (isSuperAdmin: boolean) => hasPrivilege('manage_questions', isSuperAdmin);
  const canManageHomepage = (isSuperAdmin: boolean) => hasPrivilege('manage_homepage', isSuperAdmin);
  const canManageLevels = (isSuperAdmin: boolean) => hasPrivilege('manage_levels', isSuperAdmin);
  const canManagePlanning = (isSuperAdmin: boolean) => hasPrivilege('manage_planning', isSuperAdmin);
  const canManageTestSettings = (isSuperAdmin: boolean) => hasPrivilege('manage_test_settings', isSuperAdmin);
  const canViewFinance = (isSuperAdmin: boolean) => hasPrivilege('view_finance', isSuperAdmin);

  return {
    privileges,
    loading,
    hasPrivilege,
    canManageQuestions,
    canManageHomepage,
    canManageLevels,
    canManagePlanning,
    canManageTestSettings,
    canViewFinance,
    refetch: loadPrivileges
  };
};
