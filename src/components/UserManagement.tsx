import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Download, Upload } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SCHOOLS, CLASS_LEVELS, CITIES, School, ClassLevel, City } from '@/constants/userData';
import { useUserListStats, UserListStats } from '@/hooks/useUserListStats';
import { useUserObjectiveStatus, UserObjectiveStatus } from '@/hooks/useUserObjectiveStatus';
import { useReferenceValues } from '@/hooks/useReferenceValues';

import { UserFilters, SortField, SortDirection } from '@/components/users/UserFilters';
import { UserTable } from '@/components/users/UserTable';
import { UserFormDialog, UserFormData, BulkDeleteDialog, DuplicateDialog, NormalizationDialog } from '@/components/users/UserDialogs';

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

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { users: usersWithStats, loading, refetch } = useUserListStats();
  const { objectives, getUserObjectiveStatus } = useUserObjectiveStatus();
  const { getAllSchools, getAllClasses, getAllCities, addReferenceValue } = useReferenceValues();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Reference values
  const schools = getAllSchools();
  const classes = getAllClasses();
  const cities = getAllCities();

  // State
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

  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Import state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [pendingImportUsers, setPendingImportUsers] = useState<any[]>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  const [importFileInputRef, setImportFileInputRef] = useState<HTMLInputElement | null>(null);

  // Normalization state
  const [isNormalizationDialogOpen, setIsNormalizationDialogOpen] = useState(false);
  const [unmatchedValues, setUnmatchedValues] = useState<{field: string, value: string, suggestions: string[]}[]>([]);
  const [normalizationChoices, setNormalizationChoices] = useState<Record<string, string>>({});
  const [customInputValues, setCustomInputValues] = useState<Record<string, string>>({});
  const [pendingNormalizationUsers, setPendingNormalizationUsers] = useState<any[]>([]);

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '', first_name: '', last_name: '', school: '', class_name: '', city: '', is_active: true
  });

  // --- Normalization helpers ---
  const normalizeValue = (value: string, referenceValues: readonly string[]): { normalized: string | null, exact: boolean } => {
    if (!value || value.trim() === '') return { normalized: '', exact: true };
    const trimmedValue = value.trim();
    const exactMatch = referenceValues.find(ref => ref === trimmedValue);
    if (exactMatch) return { normalized: exactMatch, exact: true };
    const caseInsensitiveMatch = referenceValues.find(ref => ref.toLowerCase() === trimmedValue.toLowerCase());
    if (caseInsensitiveMatch) return { normalized: caseInsensitiveMatch, exact: true };
    return { normalized: null, exact: false };
  };

  const findSuggestions = (value: string, referenceValues: readonly string[]): string[] => {
    const trimmedValue = value.trim().toLowerCase();
    return referenceValues.filter(ref => {
      const refLower = ref.toLowerCase();
      return refLower.includes(trimmedValue) || trimmedValue.includes(refLower) ||
        refLower.startsWith(trimmedValue.substring(0, 3)) || trimmedValue.startsWith(refLower.substring(0, 3));
    });
  };

  // --- Filtering & sorting ---
  useEffect(() => {
    let filtered = [...usersWithStats];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => u.email.toLowerCase().includes(term) ||
        u.first_name?.toLowerCase().includes(term) || u.last_name?.toLowerCase().includes(term));
    }
    if (schoolFilter !== 'all') filtered = filtered.filter(u => u.school === schoolFilter);
    if (classFilter !== 'all') filtered = filtered.filter(u => u.class_name === classFilter);
    if (cityFilter !== 'all') filtered = filtered.filter(u => u.city === cityFilter);
    if (statusFilter === 'active') filtered = filtered.filter(u => u.is_active);
    else if (statusFilter === 'inactive') filtered = filtered.filter(u => !u.is_active);
    else if (statusFilter === 'certified') filtered = filtered.filter(u => u.certifications_count > 0);
    else if (statusFilter === 'uncertified') filtered = filtered.filter(u => u.certifications_count === 0);

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase(); bVal = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase(); break;
        case 'email': aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); break;
        case 'school': aVal = a.school || ''; bVal = b.school || ''; break;
        case 'class': aVal = a.class_name || ''; bVal = b.class_name || ''; break;
        case 'certifications': aVal = a.certifications_count; bVal = b.certifications_count; break;
        case 'level': aVal = a.max_level; bVal = b.max_level; break;
        case 'tests': aVal = a.total_tests; bVal = b.total_tests; break;
        case 'score': aVal = a.avg_score; bVal = b.avg_score; break;
        case 'activity': aVal = a.last_activity ? new Date(a.last_activity).getTime() : 0; bVal = b.last_activity ? new Date(b.last_activity).getTime() : 0; break;
        default: aVal = 0; bVal = 0;
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    setFilteredUsers(filtered);
  }, [usersWithStats, searchTerm, schoolFilter, classFilter, cityFilter, statusFilter, sortField, sortDirection]);

  // --- Objective statuses ---
  useEffect(() => {
    const fetchObjectiveStatuses = async () => {
      if (objectives.length === 0 || usersWithStats.length === 0) return;
      const statuses: Record<string, UserObjectiveStatus> = {};
      for (const user of usersWithStats) {
        if (user.user_id) {
          statuses[user.user_id] = await getUserObjectiveStatus(user.user_id, user.school, user.class_name, user.city);
        }
      }
      setUserObjectiveStatuses(statuses);
    };
    fetchObjectiveStatuses();
  }, [objectives, usersWithStats, getUserObjectiveStatus]);

  // --- Realtime subscriptions ---
  useEffect(() => {
    const channels = ['users', 'test_sessions', 'user_certifications', 'question_attempts'].map((table, i) =>
      supabase.channel(`${table}-changes`).on('postgres_changes', { event: '*', schema: 'public', table }, () => refetch()).subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [refetch]);

  // --- Selection ---
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredUsers.filter(u => u.user_id).map(u => u.user_id!);
    setSelectedUserIds(selectedUserIds.size === allIds.length ? new Set() : new Set(allIds));
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.filter(u => u.user_id).length;

  // --- CRUD Operations ---
  const openUserDialog = (user?: UserListStats) => {
    if (user) {
      setEditingUser({
        id: user.user_id || '', user_id: user.user_id, email: user.email,
        first_name: user.first_name, last_name: user.last_name,
        school: user.school, class_name: user.class_name, city: user.city,
        is_active: user.is_active, created_at: user.created_at || ''
      });
      setUserForm({
        email: user.email, first_name: user.first_name || '', last_name: user.last_name || '',
        school: (user.school && SCHOOLS.includes(user.school as School)) ? user.school as School : '',
        class_name: (user.class_name && CLASS_LEVELS.includes(user.class_name as ClassLevel)) ? user.class_name as ClassLevel : '',
        city: (user.city && CITIES.includes(user.city as City)) ? user.city as City : '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setUserForm({ email: '', first_name: '', last_name: '', school: '', class_name: '', city: '', is_active: true });
    }
    setIsUserDialogOpen(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        const { error } = await supabase.from('users').update({
          email: userForm.email, first_name: userForm.first_name, last_name: userForm.last_name,
          school: userForm.school || null, class_name: userForm.class_name || null,
          city: userForm.city || null, is_active: userForm.is_active
        }).eq('id', editingUser.id);
        if (error) throw error;
        toast({ title: "Utilisateur modifié", description: "L'utilisateur a été mis à jour avec succès" });
      } else {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) { toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" }); return; }
        }
        const { data, error } = await supabase.functions.invoke('add-learner', {
          body: { email: userForm.email, first_name: userForm.first_name, last_name: userForm.last_name,
            school: userForm.school || '', class_name: userForm.class_name || '', city: userForm.city || '', password: userForm.password }
        });
        if (error) {
          if (error.message?.includes('401') || error.message?.includes('Non authentifié')) {
            toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" }); return;
          }
          throw new Error(error.message || 'Erreur lors de la création');
        }
        if (data?.error) throw new Error(data.error);
        toast({ title: "Utilisateur créé", description: userForm.password ? 'Apprenant créé avec le mot de passe défini' : 'Apprenant créé avec mot de passe temporaire.' });
      }
      setIsUserDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Erreur", description: (error as Error)?.message || "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const deleteUser = async (authUserId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast({ title: "Session expirée", description: "Reconnectez-vous", variant: "destructive" }); return; }

      const res = await fetch(`https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/delete_user_admin`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUserId })
      });
      const responseData = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
      if (!res.ok) { toast({ title: "Erreur", description: responseData.error || "Erreur inconnue", variant: "destructive" }); return; }
      toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé avec succès" });
      refetch();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur", variant: "destructive" });
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" }); return; }
      const response = await fetch(`https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/admin-reset-password`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur');
      toast({ title: "Email envoyé", description: `Email de réinitialisation envoyé à ${email}` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible d'envoyer l'email", variant: "destructive" });
    }
  };

  // --- Bulk delete ---
  const bulkDeleteUsers = async () => {
    if (bulkDeleteConfirmText !== 'oui je confirme la suppression !') {
      toast({ title: "Confirmation invalide", description: "Texte de confirmation incorrect", variant: "destructive" }); return;
    }
    setIsBulkDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast({ title: "Session expirée", description: "Reconnectez-vous", variant: "destructive" }); setIsBulkDeleting(false); return; }

      let successCount = 0, errorCount = 0;
      for (const userId of selectedUserIds) {
        try {
          const res = await fetch(`https://rglaszkaqbagpbtursjf.supabase.co/functions/v1/delete_user_admin`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
          });
          res.ok ? successCount++ : errorCount++;
        } catch { errorCount++; }
      }
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteConfirmText('');
      setSelectedUserIds(new Set());
      toast({
        title: errorCount === 0 ? "Suppression réussie" : "Suppression partielle",
        description: errorCount === 0 ? `${successCount} apprenant(s) supprimé(s)` : `${successCount} supprimé(s), ${errorCount} erreur(s)`,
        variant: errorCount > 0 ? "destructive" : undefined
      });
      refetch();
    } catch { toast({ title: "Erreur", description: "Impossible de supprimer les utilisateurs", variant: "destructive" }); }
    finally { setIsBulkDeleting(false); }
  };

  // --- CSV Export ---
  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Prénom', 'Nom', 'École', 'Classe', 'Ville', 'Actif', 'Date de création',
       'Total Tests', 'Total Questions', 'Réponses Correctes', 'Score Moyen (%)',
       'Niveau Maximum', 'Nombre Certifications', 'Détails Certifications', 'Temps Total (minutes)', 'Dernière Activité'],
      ...filteredUsers.map(u => [
        u.email, u.first_name || '', u.last_name || '', u.school || '', u.class_name || '', u.city || '',
        u.is_active ? 'Oui' : 'Non', u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-',
        u.total_tests, u.total_questions, u.correct_answers, u.avg_score, u.max_level, u.certifications_count,
        u.certifications.map(c => `N${c.level} (${c.score}% - ${c.certified_at ? new Date(c.certified_at).toLocaleDateString('fr-FR') : '-'})`).join('; '),
        u.time_spent_minutes, u.last_activity ? new Date(u.last_activity).toLocaleDateString('fr-FR') : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `apprenants_statistiques_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const maxRows = Math.max(schools.length, classes.length, cities.length);
    const rows = [['email', 'first_name', 'last_name', 'school', 'class_name', 'city']];
    for (let i = 0; i < maxRows; i++) {
      rows.push([`exemple${i + 1}@email.com`, `Prénom${i + 1}`, `Nom${i + 1}`, schools[i] || '', classes[i] || '', cities[i] || '']);
    }
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'template_apprenants.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- CSV Import ---
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formatErr = "Le format d'importation n'est pas conforme. Merci de télécharger le modèle CSV.";

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: "Format invalide", description: formatErr, variant: "destructive" });
      event.target.value = ''; return;
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) { toast({ title: "Format invalide", description: formatErr, variant: "destructive" }); event.target.value = ''; return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['email', 'first_name', 'last_name', 'school', 'class_name', 'city'];
    if (!headers.includes('email') || headers.some(h => h && !expectedHeaders.includes(h))) {
      toast({ title: "Format invalide", description: formatErr, variant: "destructive" }); event.target.value = ''; return;
    }

    const usersToImport: any[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasError = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map(v => v.trim());
      if (values.length !== headers.length) { hasError = true; break; }
      const userObj: any = {};
      headers.forEach((h, idx) => { userObj[h] = values[idx] || ''; });
      if (!userObj.email || !emailRegex.test(userObj.email)) { hasError = true; break; }
      usersToImport.push(userObj);
    }

    if (hasError || usersToImport.length === 0) {
      toast({ title: "Format invalide", description: formatErr, variant: "destructive" }); event.target.value = ''; return;
    }

    // Normalize values
    const unmatchedList: {field: string, value: string, suggestions: string[]}[] = [];
    const normalizedUsers = usersToImport.map(user => {
      const norm = { ...user };
      for (const [field, refs] of [['school', schools], ['class_name', classes], ['city', cities]] as const) {
        if (user[field]) {
          const { normalized, exact } = normalizeValue(user[field], refs);
          if (exact) { norm[field] = normalized; }
          else {
            const key = `${field}:${user[field].toLowerCase()}`;
            if (!unmatchedList.find(u => `${u.field}:${u.value.toLowerCase()}` === key)) {
              const sug = findSuggestions(user[field], refs);
              unmatchedList.push({ field, value: user[field], suggestions: sug.length > 0 ? sug : [...refs] });
            }
          }
        }
      }
      return norm;
    });

    if (unmatchedList.length > 0) {
      setUnmatchedValues(unmatchedList);
      setNormalizationChoices({});
      setPendingNormalizationUsers(normalizedUsers);
      setImportFileInputRef(event.target);
      setIsNormalizationDialogOpen(true);
      return;
    }

    await continueImportAfterNormalization(normalizedUsers, event.target);
  };

  const continueImportAfterNormalization = async (usersToImport: any[], fileInput: HTMLInputElement | null) => {
    const emailsToCheck = usersToImport.map(u => u.email.toLowerCase().trim());
    const { data: existingUsers, error: checkError } = await supabase.from('users').select('email').in('email', emailsToCheck);
    if (checkError) { toast({ title: "Erreur", description: "Impossible de vérifier les doublons", variant: "destructive" }); if (fileInput) fileInput.value = ''; return; }

    if (existingUsers && existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email.toLowerCase());
      const newOnly = usersToImport.filter(u => !existingEmails.includes(u.email.toLowerCase().trim()));
      if (newOnly.length === 0) { toast({ title: "Doublons", description: "Tous les apprenants existent déjà.", variant: "destructive" }); if (fileInput) fileInput.value = ''; return; }
      setPendingImportUsers(newOnly); setDuplicateEmails(existingEmails); setImportFileInputRef(fileInput); setIsDuplicateDialogOpen(true); return;
    }
    await executeImport(usersToImport, fileInput);
  };

  const handleApplyNormalization = async () => {
    setIsNormalizationDialogOpen(false);
    const customToSave: { field: string; value: string }[] = [];
    unmatchedValues.forEach(({ field, value }) => {
      const key = `${field}:${value}`;
      if (normalizationChoices[key] === '__custom__' && customInputValues[key]?.trim()) {
        customToSave.push({ field, value: customInputValues[key].trim() });
      }
    });
    await Promise.all(customToSave.map(({ field, value }) => addReferenceValue(field as 'school' | 'class_name' | 'city', value)));

    const normalized = pendingNormalizationUsers.map(user => {
      const norm = { ...user };
      unmatchedValues.forEach(({ field, value }) => {
        const key = `${field}:${value}`;
        const choice = normalizationChoices[key];
        if (choice && user[field]?.toLowerCase() === value.toLowerCase()) {
          norm[field] = choice === '__custom__' ? (customInputValues[key] || value) : choice;
        }
      });
      return norm;
    });

    await continueImportAfterNormalization(normalized, importFileInputRef);
    setUnmatchedValues([]); setNormalizationChoices({}); setCustomInputValues({}); setPendingNormalizationUsers([]);
  };

  const executeImport = async (usersToImport: any[], fileInput: HTMLInputElement | null) => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-users', { body: { users: usersToImport } });
      if (error) throw error;
      const { summary, results } = data;
      if (summary.errors > 0) {
        const errorEmails = results.filter((r: any) => !r.success).map((r: any) => `${r.email}: ${r.error}`).join('\n');
        toast({ title: `Import partiel (${summary.success}/${summary.total})`, description: `Erreurs:\n${errorEmails}`, variant: "destructive" });
      } else {
        toast({ title: "Import réussi", description: `${summary.success} apprenant(s) créé(s).` });
      }
      await refetch();
      if (fileInput) fileInput.value = '';
    } catch {
      toast({ title: "Erreur d'import", description: "Erreur lors de la création des utilisateurs", variant: "destructive" });
    }
  };

  // --- Impersonation ---
  const handleImpersonate = (user: UserListStats) => {
    if (!user.user_id) return;
    startImpersonation({
      user_id: user.user_id, email: user.email, first_name: user.first_name,
      last_name: user.last_name, school: user.school, class_name: user.class_name, city: user.city,
    });
    navigate('/dashboard');
  };

  if (loading) return <div className="flex justify-center p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Apprenants</CardTitle>
          <CardDescription>Gérez les comptes des apprenants, importez et exportez des listes d'utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <UserFilters
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            schoolFilter={schoolFilter} onSchoolFilterChange={setSchoolFilter}
            classFilter={classFilter} onClassFilterChange={setClassFilter}
            cityFilter={cityFilter} onCityFilterChange={setCityFilter}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            sortField={sortField} onSortFieldChange={setSortField}
            sortDirection={sortDirection} onSortDirectionChange={setSortDirection}
            schools={schools} classes={classes} cities={cities}
          />

          <div className="flex flex-wrap gap-2 mb-6">
            <Button onClick={() => openUserDialog()}><Plus className="mr-2 h-4 w-4" />Ajouter un apprenant</Button>
            {selectedUserIds.size > 0 && (
              <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />Supprimer la sélection ({selectedUserIds.size})
              </Button>
            )}
            <Button variant="outline" onClick={exportToCSV}><Download className="mr-2 h-4 w-4" />Exporter les apprenants</Button>
            <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Télécharger modèle CSV</Button>
            <Label htmlFor="csv-import" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span><Upload className="mr-2 h-4 w-4" />Importer des apprenants</span>
              </Button>
              <Input id="csv-import" type="file" accept=".csv" onChange={handleFileImport} className="hidden" />
            </Label>
          </div>

          <UserTable
            filteredUsers={filteredUsers} selectedUserIds={selectedUserIds} isAllSelected={isAllSelected}
            userObjectiveStatuses={userObjectiveStatuses}
            onToggleSelectAll={toggleSelectAll} onToggleUserSelection={toggleUserSelection}
            onImpersonate={handleImpersonate} onPasswordReset={sendPasswordReset}
            onEdit={openUserDialog} onDelete={deleteUser}
          />
        </CardContent>
      </Card>

      <UserFormDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}
        isEditing={!!editingUser} userForm={userForm} onFormChange={setUserForm} onSave={saveUser} />

      <BulkDeleteDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}
        count={selectedUserIds.size} confirmText={bulkDeleteConfirmText}
        onConfirmTextChange={setBulkDeleteConfirmText} onConfirm={bulkDeleteUsers} isDeleting={isBulkDeleting} />

      <DuplicateDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}
        duplicateEmails={duplicateEmails} newUsersCount={pendingImportUsers.length}
        onCancel={() => { setIsDuplicateDialogOpen(false); setPendingImportUsers([]); setDuplicateEmails([]); if (importFileInputRef) importFileInputRef.value = ''; }}
        onImport={async () => { setIsDuplicateDialogOpen(false); await executeImport(pendingImportUsers, importFileInputRef); setPendingImportUsers([]); setDuplicateEmails([]); }} />

      <NormalizationDialog open={isNormalizationDialogOpen} onOpenChange={setIsNormalizationDialogOpen}
        unmatchedValues={unmatchedValues} normalizationChoices={normalizationChoices} customInputValues={customInputValues}
        onChoiceChange={(k, v) => setNormalizationChoices(prev => ({ ...prev, [k]: v }))}
        onCustomInputChange={(k, v) => setCustomInputValues(prev => ({ ...prev, [k]: v }))}
        onApply={handleApplyNormalization}
        onCancel={() => { setIsNormalizationDialogOpen(false); setUnmatchedValues([]); setNormalizationChoices({}); setCustomInputValues({}); setPendingNormalizationUsers([]); if (importFileInputRef) importFileInputRef.value = ''; }} />
    </div>
  );
};
