import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Edit2, Plus, Download, Upload, Search, Filter, Award, Clock, Target, Activity, TrendingUp, Users, Smile, Frown, Goal, UserCheck, KeyRound } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SCHOOLS, CLASS_LEVELS, CITIES, School, ClassLevel, City } from '@/constants/userData';
import { useUserListStats, UserListStats } from '@/hooks/useUserListStats';
import { useUserObjectiveStatus, UserObjectiveStatus } from '@/hooks/useUserObjectiveStatus';

interface User {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  class_name: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

type SortField = 'name' | 'email' | 'school' | 'class' | 'city' | 'certifications' | 'level' | 'tests' | 'score' | 'activity';
type SortDirection = 'asc' | 'desc';

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  school: School | '';
  class_name: ClassLevel | '';
  city: City | '';
  is_active: boolean;
  password?: string;
}

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { users: usersWithStats, loading, refetch } = useUserListStats();
  const { objectives, getUserObjectiveStatus } = useUserObjectiveStatus();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [userObjectiveStatuses, setUserObjectiveStatuses] = useState<Record<string, UserObjectiveStatus>>({});
  const [filteredUsers, setFilteredUsers] = useState<UserListStats[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('activity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [schools] = useState<School[]>([...SCHOOLS]);
  const [classes] = useState<ClassLevel[]>([...CLASS_LEVELS]);
  const [cities] = useState<City[]>([...CITIES]);
  const { toast } = useToast();

  // États pour la sélection multiple
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    school: '',
    class_name: '',
    city: '',
    is_active: true
  });
  useEffect(() => {
    applyFilters();
  }, [usersWithStats, searchTerm, schoolFilter, classFilter, cityFilter, statusFilter, sortField, sortDirection]);

  // Calculer les statuts d'objectif pour chaque utilisateur
  useEffect(() => {
    const fetchObjectiveStatuses = async () => {
      if (objectives.length === 0 || usersWithStats.length === 0) return;
      
      const statuses: Record<string, UserObjectiveStatus> = {};
      
      for (const user of usersWithStats) {
        if (user.user_id) {
          const status = await getUserObjectiveStatus(
            user.user_id,
            user.school,
            user.class_name,
            user.city
          );
          statuses[user.user_id] = status;
        }
      }
      
      setUserObjectiveStatuses(statuses);
    };

    fetchObjectiveStatuses();
  }, [objectives, usersWithStats, getUserObjectiveStatus]);

  // Écoute en temps réel des changements sur les tables liées
  useEffect(() => {
    const channels = [
      // Changements sur la table users
      supabase
        .channel('users-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          () => {
            console.log('Changement détecté dans la table users');
            refetch();
          }
        )
        .subscribe(),

      // Changements sur les sessions de test
      supabase
        .channel('test-sessions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'test_sessions'
          },
          () => {
            console.log('Changement détecté dans les sessions de test');
            refetch();
          }
        )
        .subscribe(),

      // Changements sur les certifications
      supabase
        .channel('user-certifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_certifications'
          },
          () => {
            console.log('Changement détecté dans les certifications');
            refetch();
          }
        )
        .subscribe(),

      // Changements sur les tentatives de questions
      supabase
        .channel('question-attempts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'question_attempts'
          },
          () => {
            console.log('Changement détecté dans les tentatives de questions');
            refetch();
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetch]);

  const applyFilters = () => {
    let filtered = [...usersWithStats];

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par école
    if (schoolFilter && schoolFilter !== 'all') {
      filtered = filtered.filter(user => user.school === schoolFilter);
    }

    // Filtrage par classe
    if (classFilter && classFilter !== 'all') {
      filtered = filtered.filter(user => user.class_name === classFilter);
    }

    // Filtrage par ville
    if (cityFilter && cityFilter !== 'all') {
      filtered = filtered.filter(user => user.city === cityFilter);
    }

    // Filtrage par statut
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      } else if (statusFilter === 'certified') {
        filtered = filtered.filter(user => user.certifications_count > 0);
      } else if (statusFilter === 'uncertified') {
        filtered = filtered.filter(user => user.certifications_count === 0);
      }
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'school':
          aValue = a.school || '';
          bValue = b.school || '';
          break;
        case 'class':
          aValue = a.class_name || '';
          bValue = b.class_name || '';
          break;
        case 'certifications':
          aValue = a.certifications_count;
          bValue = b.certifications_count;
          break;
        case 'level':
          aValue = a.max_level;
          bValue = b.max_level;
          break;
        case 'tests':
          aValue = a.total_tests;
          bValue = b.total_tests;
          break;
        case 'score':
          aValue = a.avg_score;
          bValue = b.avg_score;
          break;
        case 'activity':
          aValue = a.last_activity ? new Date(a.last_activity).getTime() : 0;
          bValue = b.last_activity ? new Date(b.last_activity).getTime() : 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  };

  const openUserDialog = (user?: UserListStats) => {
    if (user) {
      // Convertir UserListStats vers User pour la compatibilité
      const userForEdit: User = {
        id: user.user_id || '',
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        school: user.school,
        class_name: user.class_name,
        city: user.city,
        is_active: user.is_active,
        created_at: user.created_at || ''
      };
      
      setEditingUser(userForEdit);
      setUserForm({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        school: (user.school && SCHOOLS.includes(user.school as School)) ? user.school as School : '',
        class_name: (user.class_name && CLASS_LEVELS.includes(user.class_name as ClassLevel)) ? user.class_name as ClassLevel : '',
        city: (user.city && CITIES.includes(user.city as City)) ? user.city as City : '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setUserForm({
        email: '',
        first_name: '',
        last_name: '',
        school: '',
        class_name: '',
        city: '',
        is_active: true
      });
    }
    setIsUserDialogOpen(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        // Modification - utiliser la table users directement pour les modifications
        const { error } = await supabase
          .from('users')
          .update({
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            school: userForm.school || null,
            class_name: userForm.class_name || null,
            city: userForm.city || null,
            is_active: userForm.is_active
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: "Utilisateur modifié",
          description: "L'utilisateur a été mis à jour avec succès"
        });
      } else {
        // Vérifier et rafraîchir la session avant l'appel
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          // Tenter de rafraîchir la session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            toast({
              title: "Session expirée",
              description: "Veuillez vous reconnecter pour continuer",
              variant: "destructive"
            });
            return;
          }
        }

        // Création - toujours utiliser add-learner pour éviter les limites d'emails
        const { data, error } = await supabase.functions.invoke('add-learner', {
          body: {
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            school: userForm.school || '',
            class_name: userForm.class_name || '',
            city: userForm.city || '',
            password: userForm.password // Si pas de mot de passe, un temporaire sera généré
          }
        });

        if (error) {
          console.error('Erreur add-learner:', error);
          // Gérer spécifiquement l'erreur de session expirée
          if (error.message?.includes('401') || error.message?.includes('Non authentifié')) {
            toast({
              title: "Session expirée",
              description: "Veuillez vous reconnecter pour continuer",
              variant: "destructive"
            });
            return;
          }
          throw new Error(error.message || 'Erreur lors de la création de l\'utilisateur');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const successMessage = userForm.password 
          ? 'Apprenant créé avec le mot de passe défini'
          : 'Apprenant créé avec mot de passe temporaire. Il devra le changer à la première connexion.';
        
        toast({
          title: "Utilisateur créé",
          description: successMessage
        });
      }

      setIsUserDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: (error as Error)?.message || "Impossible de sauvegarder l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (authUserId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      // Récupérer le token de session
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({
          title: "Session expirée",
          description: "Session expirée, reconnectez-vous",
          variant: "destructive"
        });
        return;
      }

      console.log('Calling delete_user_admin for auth user:', authUserId);

      // Appel à l'Edge Function
      const res = await fetch(
        'https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/delete_user_admin',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: authUserId })
        }
      );

      const text = await res.text();
      console.log('delete_user_admin', res.status, text);

      let responseData: { error?: string; details?: string; message?: string };
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { error: text };
      }

      if (!res.ok) {
        toast({
          title: "Erreur de suppression",
          description: responseData.error || responseData.details || responseData.message || "Erreur inconnue",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès"
      });

      refetch();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  // Fonction pour envoyer un email de réinitialisation de mot de passe
  const sendPasswordReset = async (email: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(
        'https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/admin-reset-password',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast({
        title: "Email envoyé",
        description: `Un email de réinitialisation a été envoyé à ${email}`
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive"
      });
    }
  };

  // Fonctions de sélection multiple
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.filter(u => u.user_id).length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.filter(u => u.user_id).map(u => u.user_id!)));
    }
  };

  const isAllSelected = filteredUsers.length > 0 && 
    selectedUserIds.size === filteredUsers.filter(u => u.user_id).length;

  const bulkDeleteUsers = async () => {
    if (bulkDeleteConfirmText !== 'oui je confirme la suppression !') {
      toast({
        title: "Confirmation invalide",
        description: "Veuillez écrire exactement : oui je confirme la suppression !",
        variant: "destructive"
      });
      return;
    }

    setIsBulkDeleting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({
          title: "Session expirée",
          description: "Session expirée, reconnectez-vous",
          variant: "destructive"
        });
        setIsBulkDeleting(false);
        return;
      }

      const userIdsToDelete = Array.from(selectedUserIds);
      let successCount = 0;
      let errorCount = 0;

      for (const userId of userIdsToDelete) {
        try {
          console.log('Bulk delete - deleting user:', userId);
          const res = await fetch(
            'https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/delete_user_admin',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ user_id: userId })
            }
          );

          const text = await res.text();
          console.log('delete_user_admin bulk', res.status, text);

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error deleting user:', userId, error);
          errorCount++;
        }
      }

      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteConfirmText('');
      setSelectedUserIds(new Set());

      if (errorCount === 0) {
        toast({
          title: "Suppression réussie",
          description: `${successCount} apprenant(s) supprimé(s) avec succès`
        });
      } else {
        toast({
          title: "Suppression partielle",
          description: `${successCount} supprimé(s), ${errorCount} erreur(s)`,
          variant: "destructive"
        });
      }

      refetch();
    } catch (error) {
      console.error('Erreur lors de la suppression groupée:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        'Email', 'Prénom', 'Nom', 'École', 'Classe', 'Ville', 'Actif', 'Date de création',
        'Total Tests', 'Total Questions', 'Réponses Correctes', 'Score Moyen (%)',
        'Niveau Maximum', 'Nombre Certifications', 'Détails Certifications',
        'Temps Total (minutes)', 'Dernière Activité'
      ],
      ...filteredUsers.map(user => [
        user.email,
        user.first_name || '',
        user.last_name || '',
        user.school || '',
        user.class_name || '',
        user.city || '',
        user.is_active ? 'Oui' : 'Non',
        user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-',
        user.total_tests.toString(),
        user.total_questions.toString(),
        user.correct_answers.toString(),
        user.avg_score.toString(),
        user.max_level.toString(),
        user.certifications_count.toString(),
        user.certifications.map(cert => 
          `N${cert.level} (${cert.score}% - ${cert.certified_at ? new Date(cert.certified_at).toLocaleDateString('fr-FR') : '-'})`
        ).join('; '),
        user.time_spent_minutes.toString(),
        user.last_activity ? new Date(user.last_activity).toLocaleDateString('fr-FR') : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `apprenants_statistiques_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const template = [
      ['email', 'first_name', 'last_name', 'school', 'class_name', 'city'],
      ['exemple@email.com', 'Jean', 'Dupont', 'ESCEN', 'N1', 'Paris'],
      ['autre@email.com', 'Marie', 'Martin', 'Bachelor Institute', 'N2', 'Lyon']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_apprenants.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    if (!headers.includes('email')) {
      toast({
        title: "Format invalide",
        description: "Le fichier doit contenir au minimum une colonne 'email'",
        variant: "destructive"
      });
      return;
    }

    const usersToImport = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim());
        const userObj: any = {};
        headers.forEach((header, index) => {
          userObj[header] = values[index] || '';
        });
        return userObj;
      })
      .filter(user => user.email);

    if (usersToImport.length === 0) {
      toast({
        title: "Aucun utilisateur trouvé",
        description: "Le fichier ne contient aucun utilisateur valide",
        variant: "destructive"
      });
      return;
    }

    // Vérifier si des emails existent déjà dans la base de données
    const emailsToCheck = usersToImport.map(u => u.email.toLowerCase().trim());
    
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email')
      .in('email', emailsToCheck);

    if (checkError) {
      console.error('Erreur lors de la vérification des doublons:', checkError);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les doublons dans la base de données",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email).join(', ');
      toast({
        title: "Attention, les étudiants dans cette liste existent déjà. Merci de vérifier.",
        description: `Impossible d'importer des listes d'apprenants qui existent déjà dans la base de données. Emails concernés : ${existingEmails}`,
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    try {
      // Utiliser la fonction edge pour créer les utilisateurs avec mots de passe générés
      const { data, error } = await supabase.functions.invoke('invite-users', {
        body: { users: usersToImport }
      });

      if (error) throw error;

      const { summary, results } = data;
      
      if (summary.errors > 0) {
        const errorEmails = results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.email}: ${r.error}`)
          .join('\n');
        
        toast({
          title: `Import partiel (${summary.success}/${summary.total})`,
          description: `Erreurs:\n${errorEmails}`,
          variant: "destructive"
        });
      } else {
        // Afficher les mots de passe générés
        const passwordList = results
          .filter((r: any) => r.success && r.generated_password)
          .map((r: any) => `${r.email}: ${r.generated_password}`)
          .join('\n');
        
        toast({
          title: "Import réussi",
          description: `${summary.success} apprenant(s) créé(s). Mots de passe temporaires générés (prénom.nom). Les utilisateurs devront changer leur mot de passe à la première connexion.`
        });
        
        // Log les mots de passe pour que l'admin puisse les voir dans la console
        if (passwordList) {
          console.log('Mots de passe générés:\n' + passwordList);
        }
      }

      refetch();
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast({
        title: "Erreur d'import",
        description: "Erreur lors de la création des utilisateurs",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Apprenants</CardTitle>
          <CardDescription>
            Gérez les comptes des apprenants, importez et exportez des listes d'utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres et recherche */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="École" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les écoles</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map(className => (
                    <SelectItem key={className} value={className}>{className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                  <SelectItem value="certified">Certifiés</SelectItem>
                  <SelectItem value="uncertified">Non certifiés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tri */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-field" className="text-sm font-medium">Trier par:</Label>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Dernière activité</SelectItem>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="certifications">Certifications</SelectItem>
                    <SelectItem value="level">Niveau max</SelectItem>
                    <SelectItem value="tests">Tests effectués</SelectItem>
                    <SelectItem value="score">Score moyen</SelectItem>
                    <SelectItem value="school">École</SelectItem>
                    <SelectItem value="class">Classe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Ordre:</Label>
                <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Décroissant</SelectItem>
                    <SelectItem value="asc">Croissant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button onClick={() => openUserDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un apprenant
            </Button>
            
            {selectedUserIds.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer la sélection ({selectedUserIds.size})
              </Button>
            )}
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exporter les apprenants
            </Button>
            
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger modèle CSV
            </Button>
            
            <Label htmlFor="csv-import" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer des apprenants
                </span>
              </Button>
              <Input
                id="csv-import"
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </Label>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Sélectionner tout"
                    />
                  </TableHead>
                  <TableHead>Apprenant</TableHead>
                  <TableHead>École / Classe / Ville</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="h-4 w-4" />
                      Certifs
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Niveau
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="h-4 w-4" />
                      Tests
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="h-4 w-4" />
                      Score
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" />
                      Temps
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Goal className="h-4 w-4" />
                      Objectif
                    </div>
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id || user.email}>
                    <TableCell>
                      {user.user_id && (
                        <Checkbox
                          checked={selectedUserIds.has(user.user_id)}
                          onCheckedChange={() => toggleUserSelection(user.user_id!)}
                          aria-label={`Sélectionner ${user.first_name} ${user.last_name}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sans nom'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                        {user.last_activity && (
                          <div className="text-xs text-muted-foreground">
                            Dernière activité: {new Date(user.last_activity).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{user.school || '-'}</div>
                        <div className="text-muted-foreground">{user.class_name || '-'}</div>
                        <div className="text-muted-foreground text-xs">{user.city || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <Badge variant={user.certifications_count > 0 ? "default" : "secondary"}>
                          {user.certifications_count}
                        </Badge>
                        {user.certifications.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Dernière: {user.certifications[0].certified_at ? new Date(user.certifications[0].certified_at).toLocaleDateString('fr-FR') : '-'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        N{user.max_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-medium">{user.total_tests}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.total_questions} Q
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-medium">{user.avg_score}%</div>
                        <div className="text-xs text-muted-foreground">
                          {user.correct_answers}/{user.total_questions}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        {user.time_spent_minutes > 0 ? (
                          <>
                            <div className="font-medium">
                              {Math.floor(user.time_spent_minutes / 60)}h{String(user.time_spent_minutes % 60).padStart(2, '0')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.time_spent_minutes} min
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        {user.user_id && userObjectiveStatuses[user.user_id]?.hasObjective ? (
                          <Tooltip>
                            <TooltipTrigger>
                              {userObjectiveStatuses[user.user_id].status === 'ok' ? (
                                <div className="flex items-center justify-center">
                                  <Smile className="h-5 w-5 text-green-500" />
                                </div>
                              ) : userObjectiveStatuses[user.user_id].status === 'warning' ? (
                                <div className="flex items-center justify-center">
                                  <Frown className="h-5 w-5 text-orange-500" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <Frown className="h-5 w-5 text-red-500" />
                                </div>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="font-medium">
                                  {userObjectiveStatuses[user.user_id].status === 'ok' 
                                    ? 'Dans les temps' 
                                    : userObjectiveStatuses[user.user_id].status === 'warning'
                                    ? 'Léger retard'
                                    : 'Retard important'}
                                </p>
                                <p>Progression: {Math.round(userObjectiveStatuses[user.user_id].userProgress)}%</p>
                                <p>Attendu: {Math.round(userObjectiveStatuses[user.user_id].expectedProgress)}%</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        {user.certifications_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Certifié
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.user_id && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    startImpersonation({
                                      user_id: user.user_id!,
                                      email: user.email,
                                      first_name: user.first_name,
                                      last_name: user.last_name,
                                      school: user.school,
                                      class_name: user.class_name,
                                      city: user.city,
                                    });
                                    navigate('/dashboard');
                                  }}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Voir en tant que cet utilisateur</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => sendPasswordReset(user.email)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Renvoyer mot de passe</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUserDialog(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.user_id || '')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun apprenant trouvé
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'apprenant' : 'Ajouter un apprenant'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations de l'apprenant
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="school">École</Label>
              <Select
                value={userForm.school}
                onValueChange={(value) => setUserForm(prev => ({ ...prev, school: value as School | '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une école" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOLS.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="class_name">Classe</Label>
              <Select
                value={userForm.class_name}
                onValueChange={(value) => setUserForm(prev => ({ ...prev, class_name: value as ClassLevel | '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map(className => (
                    <SelectItem key={className} value={className}>{className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Select
                value={userForm.city}
                onValueChange={(value) => setUserForm(prev => ({ ...prev, city: value as City | '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une ville" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe (optionnel)</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password || ''}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Laisser vide pour mot de passe temporaire"
                />
                <p className="text-sm text-muted-foreground">
                  Si aucun mot de passe n'est défini, un mot de passe temporaire sera généré. L'apprenant devra le changer à la première connexion.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveUser} disabled={!userForm.email}>
              {editingUser ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression groupée */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Supprimer {selectedUserIds.size} apprenant(s)
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Pour confirmer, écrivez exactement :
              <br />
              <span className="font-mono font-bold text-destructive">oui je confirme la suppression !</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text">Confirmation</Label>
              <Input
                id="confirm-text"
                value={bulkDeleteConfirmText}
                onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                placeholder="oui je confirme la suppression !"
                className="font-mono"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBulkDeleteDialogOpen(false);
                setBulkDeleteConfirmText('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={bulkDeleteUsers}
              disabled={isBulkDeleting || bulkDeleteConfirmText !== 'oui je confirme la suppression !'}
            >
              {isBulkDeleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};