import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit2, Plus, Shield, UserCog, Mail } from 'lucide-react';
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
          loadAdministrators(); // Rafraîchir les données
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        
        // Générer un mot de passe temporaire
        const tempPassword = generateTemporaryPassword();
        
        // Appeler l'edge function qui crée le compte et envoie l'email
        const { data, error: inviteError } = await supabase.functions.invoke('send-admin-invitation', {
          body: {
            email: formData.email,
            is_super_admin: formData.is_super_admin,
            temporary_password: tempPassword
          }
        });

        if (inviteError) {
          console.error('Invite error:', inviteError);
          toast.error(inviteError.message || 'Erreur lors de l\'invitation');
          return;
        }

        if (data?.error) {
          console.error('Server error:', data.error);
          toast.error(data.error);
          return;
        }

        toast.success('Administrateur ajouté et email d\'invitation envoyé');
      }

      setIsDialogOpen(false);
      setEditingAdmin(null);
      setFormData({ email: '', is_super_admin: false });
      loadAdministrators();
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
    
    // Assurer au moins un caractère de chaque type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 26)); // Majuscule
    password += "abcdefghijklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 26)); // Minuscule
    password += "0123456789".charAt(Math.floor(Math.random() * 10)); // Chiffre
    password += "!@#$%^&*".charAt(Math.floor(Math.random() * 8)); // Caractère spécial
    
    // Remplir le reste
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Mélanger les caractères
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestion des administrateurs
          </div>
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