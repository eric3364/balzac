import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, Download, Upload, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SCHOOLS, CLASS_LEVELS, School, ClassLevel } from '@/constants/userData';

interface User {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  class_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  school: School | '';
  class_name: ClassLevel | '';
  is_active: boolean;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [schools] = useState<School[]>([...SCHOOLS]);
  const [classes] = useState<ClassLevel[]>([...CLASS_LEVELS]);
  const { toast } = useToast();

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    school: '',
    class_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, schoolFilter, classFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (schoolFilter && schoolFilter !== 'all') {
      filtered = filtered.filter(user => user.school === schoolFilter);
    }

    if (classFilter && classFilter !== 'all') {
      filtered = filtered.filter(user => user.class_name === classFilter);
    }

    setFilteredUsers(filtered);
  };

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        school: (user.school && SCHOOLS.includes(user.school as School)) ? user.school as School : '',
        class_name: (user.class_name && CLASS_LEVELS.includes(user.class_name as ClassLevel)) ? user.class_name as ClassLevel : '',
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
        is_active: true
      });
    }
    setIsUserDialogOpen(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        // Modification
        const { error } = await supabase
          .from('users')
          .update({
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            school: userForm.school || null,
            class_name: userForm.class_name || null,
            is_active: userForm.is_active
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: "Utilisateur modifié",
          description: "L'utilisateur a été mis à jour avec succès"
        });
      } else {
        // Création
        const { error } = await supabase
          .from('users')
          .insert({
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            school: userForm.school || null,
            class_name: userForm.class_name || null,
            is_active: userForm.is_active
          });

        if (error) throw error;

        toast({
          title: "Utilisateur créé",
          description: "L'utilisateur a été créé avec succès"
        });
      }

      setIsUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès"
      });

      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Prénom', 'Nom', 'École', 'Classe', 'Actif', 'Date de création'],
      ...filteredUsers.map(user => [
        user.email,
        user.first_name || '',
        user.last_name || '',
        user.school || '',
        user.class_name || '',
        user.is_active ? 'Oui' : 'Non',
        new Date(user.created_at).toLocaleDateString('fr-FR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `apprenants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const template = [
      ['email', 'first_name', 'last_name', 'school', 'class_name'],
      ['exemple@email.com', 'Jean', 'Dupont', 'ESCEN', 'N1'],
      ['autre@email.com', 'Marie', 'Martin', 'Bachelor Institute', 'N2']
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

    try {
      const { error } = await supabase
        .from('users')
        .insert(usersToImport.map(user => ({
          email: user.email,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          school: user.school || null,
          class_name: user.class_name || null,
          is_active: true
        })));

      if (error) throw error;

      toast({
        title: "Import réussi",
        description: `${usersToImport.length} utilisateur(s) importé(s) avec succès`
      });

      fetchUsers();
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast({
        title: "Erreur d'import",
        description: "Certains utilisateurs n'ont pas pu être importés",
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
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
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
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Filtrer par école" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les écoles</SelectItem>
                {schools.map(school => (
                  <SelectItem key={school} value={school}>{school}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map(className => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button onClick={() => openUserDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un apprenant
            </Button>
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger modèle CSV
            </Button>
            
            <Label htmlFor="csv-import" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer CSV
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
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>École</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                    </TableCell>
                    <TableCell>{user.school || '-'}</TableCell>
                    <TableCell>{user.class_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                          onClick={() => deleteUser(user.id)}
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
    </div>
  );
};