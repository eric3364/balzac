import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, FileText, Home, GraduationCap, Calendar, Settings, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminPrivilege {
  id: string;
  privilege_key: string;
  privilege_label: string;
  is_enabled: boolean;
  description: string | null;
}

const privilegeIcons: Record<string, React.ReactNode> = {
  manage_questions: <FileText className="h-5 w-5" />,
  manage_homepage: <Home className="h-5 w-5" />,
  manage_levels: <GraduationCap className="h-5 w-5" />,
  manage_planning: <Calendar className="h-5 w-5" />,
  manage_test_settings: <Settings className="h-5 w-5" />,
  view_finance: <DollarSign className="h-5 w-5" />,
};

export const AdminPrivilegesManager: React.FC = () => {
  const [privileges, setPrivileges] = useState<AdminPrivilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivileges();
  }, []);

  const loadPrivileges = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_privileges')
        .select('*')
        .order('privilege_label');

      if (error) throw error;
      setPrivileges(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des privilèges:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les privilèges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePrivilege = async (privilege: AdminPrivilege) => {
    setUpdating(privilege.id);
    try {
      const { error } = await supabase
        .from('admin_privileges')
        .update({ is_enabled: !privilege.is_enabled })
        .eq('id', privilege.id);

      if (error) throw error;

      setPrivileges(prev => 
        prev.map(p => 
          p.id === privilege.id 
            ? { ...p, is_enabled: !p.is_enabled } 
            : p
        )
      );

      toast({
        title: "Privilège mis à jour",
        description: `${privilege.privilege_label} est maintenant ${!privilege.is_enabled ? 'activé' : 'désactivé'} pour les administrateurs`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le privilège",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = privileges.filter(p => p.is_enabled).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Privilèges des administrateurs
                <Badge variant="secondary" className="ml-2">
                  <Users className="h-3 w-3 mr-1" />
                  Admins
                </Badge>
              </CardTitle>
              <CardDescription>
                Configurez les fonctionnalités accessibles aux administrateurs (non super-admins)
              </CardDescription>
            </div>
          </div>
          <Badge variant={enabledCount > 0 ? "default" : "outline"}>
            {enabledCount} / {privileges.length} activés
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {privileges.map((privilege) => (
            <div 
              key={privilege.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                privilege.is_enabled 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  privilege.is_enabled 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {privilegeIcons[privilege.privilege_key] || <Settings className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-medium">{privilege.privilege_label}</h4>
                  {privilege.description && (
                    <p className="text-sm text-muted-foreground">{privilege.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={privilege.is_enabled ? "default" : "secondary"}>
                  {privilege.is_enabled ? 'Activé' : 'Désactivé'}
                </Badge>
                <Switch
                  checked={privilege.is_enabled}
                  onCheckedChange={() => togglePrivilege(privilege)}
                  disabled={updating === privilege.id}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Les super-administrateurs ont toujours accès à toutes les fonctionnalités, 
            indépendamment de ces paramètres. Ces privilèges s'appliquent uniquement aux administrateurs standard.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
