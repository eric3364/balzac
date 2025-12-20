import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit2, Shield, UserCog, Mail, Download, Upload, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AdminUser {
  id: number;
  email: string;
  is_super_admin: boolean;
  user_id: string | null;
  created_at: string | null;
}

interface AdminFormData {
  email: string;
  is_super_admin: boolean;
}

export const AdminManager = () => {
  const [administrators, setAdministrators] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    email: '',
    is_super_admin: false
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAdministrators = async () => {
    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdministrators((data || []).map(admin => ({
        ...admin,
        is_super_admin: admin.is_super_admin || false
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des administrateurs:', error);
      toast.error('Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdministrators();
  }, []);

  // Écoute en temps réel des changements sur la table administrators
  useEffect(() => {
    const channel = supabase
      .channel('administrators-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'administrators'
        },
        (payload) => {
          console.log('Changement détecté dans la table administrators:', payload);
          loadAdministrators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fonction pour exporter les administrateurs en CSV
  const exportAdministrators = () => {
    const headers = ['email', 'is_super_admin', 'created_at'];
    const csvContent = [
      headers.join(','),
      ...administrators.map(admin => [
        admin.email,
        admin.is_super_admin ? 'true' : 'false',
        admin.created_at || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `administrateurs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${administrators.length} administrateurs exportés`);
  };

  // Fonction pour télécharger le modèle CSV (format identique aux apprenants + is_super_admin)
  const downloadTemplate = () => {
    const headers = ['email', 'first_name', 'last_name', 'school', 'class_name', 'city', 'is_super_admin'];
    const exampleRows = [
      ['admin@exemple.com', 'Jean', 'Dupont', 'École A', 'Classe 1', 'Paris', 'false'],
      ['superadmin@exemple.com', 'Marie', 'Martin', 'École B', 'Classe 2', 'Lyon', 'true']
    ];
    
    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele_administrateurs.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Modèle CSV téléchargé');
  };

  // Fonction pour importer des administrateurs depuis un CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
        return;
      }

      // Parser l'en-tête
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const emailIndex = headers.findIndex(h => h === 'email');
      const isSuperAdminIndex = headers.findIndex(h => h === 'is_super_admin' || h === 'super_admin' || h === 'superadmin');

      if (emailIndex === -1) {
        toast.error('Colonne "email" requise dans le fichier CSV');
        return;
      }

      // Parser les données
      const adminsToImport: { email: string; is_super_admin: boolean }[] = [];
      const existingEmails = new Set(administrators.map(a => a.email.toLowerCase()));
      const duplicates: string[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parser la ligne CSV (gérer les guillemets)
        const values = line.match(/("([^"]*)"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
        
        const email = values[emailIndex]?.toLowerCase();
        if (!email || !email.includes('@')) {
          errors.push(`Ligne ${i + 1}: Email invalide`);
          continue;
        }

        if (existingEmails.has(email)) {
          duplicates.push(email);
          continue;
        }

        const isSuperAdmin = isSuperAdminIndex !== -1 
          ? ['true', '1', 'oui', 'yes'].includes(values[isSuperAdminIndex]?.toLowerCase() || '')
          : false;

        adminsToImport.push({ email, is_super_admin: isSuperAdmin });
        existingEmails.add(email);
      }

      if (errors.length > 0) {
        toast.error(`Erreurs trouvées: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }

      if (duplicates.length > 0) {
        toast.warning(`${duplicates.length} email(s) déjà existant(s) ignoré(s)`);
      }

      if (adminsToImport.length === 0) {
        toast.info('Aucun nouvel administrateur à importer');
        return;
      }

      // Importer les administrateurs un par un via l'edge function
      let successCount = 0;
      let errorCount = 0;

      for (const admin of adminsToImport) {
        try {
          const tempPassword = generateTemporaryPassword();
          
          const { data, error } = await supabase.functions.invoke('send-admin-invitation', {
            body: {
              email: admin.email,
              is_super_admin: admin.is_super_admin,
              temporary_password: tempPassword
            }
          });

          if (error || data?.error) {
            console.error(`Erreur pour ${admin.email}:`, error || data?.error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Erreur pour ${admin.email}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} administrateur(s) importé(s) avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'import`);
      }

      loadAdministrators();
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast.error('Erreur lors de la lecture du fichier CSV');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast.error('L\'email est requis');
      return;
    }

    try {
      if (editingAdmin) {
        // Modifier un administrateur existant
        const { error } = await supabase
          .from('administrators')
          .update({
            email: formData.email,
            is_super_admin: formData.is_super_admin
          })
          .eq('id', editingAdmin.id);

        if (error) throw error;
        toast.success('Administrateur modifié avec succès');
      } else {
        // Ajouter un nouvel administrateur via edge function
        const tempPassword = generateTemporaryPassword();
        
        const { data, error: inviteError } = await supabase.functions.invoke('send-admin-invitation', {
          body: {
            email: formData.email,
            is_super_admin: formData.is_super_admin,
            temporary_password: tempPassword
          }
        });

        if (inviteError) {
          console.error('Invite error:', inviteError);
          toast.error(`Erreur: ${inviteError.message || 'Impossible d\'inviter l\'administrateur'}`);
          return;
        }

        if (data?.error) {
          console.error('Server error:', data.error, data.details);
          toast.error(`${data.error}${data.details ? ` - ${data.details}` : ''}`);
          return;
        }

        console.log('Admin invitation successful:', data);
        toast.success('Administrateur ajouté et email d\'invitation envoyé');
      }

      setIsDialogOpen(false);
      setEditingAdmin(null);
      setFormData({ email: '', is_super_admin: false });
      
      await loadAdministrators();
      setTimeout(() => loadAdministrators(), 1000);
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.code === '23505') {
        toast.error('Cet email existe déjà comme administrateur');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    }
  };

  // Fonction pour générer un mot de passe temporaire sécurisé
  const generateTemporaryPassword = (): string => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 26));
    password += "abcdefghijklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 26));
    password += "0123456789".charAt(Math.floor(Math.random() * 10));
    password += "!@#$%^&*".charAt(Math.floor(Math.random() * 8));
    
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      is_super_admin: admin.is_super_admin
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (admin: AdminUser) => {
    try {
      const { error } = await supabase
        .from('administrators')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;
      toast.success('Administrateur supprimé avec succès');
      loadAdministrators();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openAddDialog = () => {
    setEditingAdmin(null);
    setFormData({ email: '', is_super_admin: false });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestion des administrateurs
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Modèle CSV */}
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileText className="h-4 w-4 mr-2" />
              Modèle CSV
            </Button>
            
            {/* Bouton Export */}
            <Button variant="outline" size="sm" onClick={exportAdministrators}>
              <Download className="h-4 w-4 mr-2" />
              Exporter ({administrators.length})
            </Button>
            
            {/* Bouton Import */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Import en cours...' : 'Importer'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />

            {/* Bouton Inviter */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Inviter un administrateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingAdmin ? 'Modifier l\'administrateur' : 'Inviter un administrateur'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAdmin 
                      ? 'Modifiez les informations de l\'administrateur'
                      : 'Invitez un nouvel administrateur. Un email avec les informations de connexion sera automatiquement envoyé.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@exemple.com"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_super_admin"
                      checked={formData.is_super_admin}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_super_admin: checked }))}
                    />
                    <Label htmlFor="is_super_admin">Super administrateur</Label>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingAdmin ? 'Modifier' : 'Inviter'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Gérez les utilisateurs qui ont accès aux fonctionnalités d'administration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {administrators.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.is_super_admin ? "default" : "secondary"}>
                      <UserCog className="h-3 w-3 mr-1" />
                      {admin.is_super_admin ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.created_at 
                      ? new Date(admin.created_at).toLocaleDateString('fr-FR')
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(admin)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'administrateur</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'administrateur {admin.email} ?
                              Cette action ne peut pas être annulée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(admin)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {administrators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun administrateur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
