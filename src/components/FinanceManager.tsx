import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Euro, Users, ShoppingCart, Gift, TrendingUp, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Purchase {
  id: string;
  level: number;
  price_paid: number;
  status: string;
  purchased_at: string;
  payment_method: string;
  user_id: string;
}

interface PromoCode {
  id: string;
  code: string;
  level: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface Stats {
  totalRevenue: number;
  totalSales: number;
  totalUsers: number;
  averageOrderValue: number;
}

export const FinanceManager: React.FC = () => {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalSales: 0,
    totalUsers: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Promo code form
  const [newPromoCode, setNewPromoCode] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState('');
  
  // Edit promo code
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editLevel, setEditLevel] = useState<string>('');
  const [editExpiration, setEditExpiration] = useState('');

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      
      // Charger les achats
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('user_level_purchases')
        .select('*')
        .order('purchased_at', { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);

      // Charger les codes promo
      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) throw promoError;
      setPromoCodes(promoData || []);

      // Calculer les statistiques
      const completedPurchases = purchasesData?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + Number(p.price_paid), 0);
      const totalSales = completedPurchases.length;
      
      // Nombre d'utilisateurs uniques ayant effectué un achat
      const uniqueUsers = new Set(completedPurchases.map(p => p.user_id)).size;
      
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      setStats({
        totalRevenue,
        totalSales,
        totalUsers: uniqueUsers,
        averageOrderValue
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données financières:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPromoCode = async () => {
    if (!newPromoCode.trim() || !selectedLevel) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_codes')
        .insert({
          code: newPromoCode.trim().toUpperCase(),
          level: parseInt(selectedLevel),
          expires_at: expirationDate ? new Date(expirationDate).toISOString() : null
        });

      if (error) throw error;

      toast({
        title: "Code promo créé",
        description: `Le code ${newPromoCode.toUpperCase()} a été créé avec succès.`,
      });

      setNewPromoCode('');
      setSelectedLevel('');
      setExpirationDate('');
      loadFinanceData();
      
    } catch (error: any) {
      console.error('Erreur lors de la création du code promo:', error);
      toast({
        title: "Erreur",
        description: error.message === 'duplicate key value violates unique constraint "promo_codes_code_key"' 
          ? "Ce code promo existe déjà." 
          : "Impossible de créer le code promo.",
        variant: "destructive",
      });
    }
  };

  const deletePromoCode = async (promoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', promoId);

      if (error) throw error;

      toast({
        title: "Code promo supprimé",
        description: "Le code promo a été supprimé avec succès.",
      });

      loadFinanceData();
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression du code promo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code promo.",
        variant: "destructive",
      });
    }
  };

  const startEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);
    setEditCode(promo.code);
    setEditLevel(promo.level.toString());
    setEditExpiration(promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : '');
  };

  const cancelEdit = () => {
    setEditingPromo(null);
    setEditCode('');
    setEditLevel('');
    setEditExpiration('');
  };

  const updatePromoCode = async () => {
    if (!editingPromo || !editCode.trim() || !editLevel) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({
          code: editCode.trim().toUpperCase(),
          level: parseInt(editLevel),
          expires_at: editExpiration ? new Date(editExpiration).toISOString() : null
        })
        .eq('id', editingPromo.id);

      if (error) throw error;

      toast({
        title: "Code promo modifié",
        description: `Le code ${editCode.toUpperCase()} a été modifié avec succès.`,
      });

      cancelEdit();
      loadFinanceData();
      
    } catch (error: any) {
      console.error('Erreur lors de la modification du code promo:', error);
      toast({
        title: "Erreur",
        description: error.message === 'duplicate key value violates unique constraint "promo_codes_code_key"' 
          ? "Ce code promo existe déjà." 
          : "Impossible de modifier le code promo.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des données financières...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients payants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Ventes</TabsTrigger>
          <TabsTrigger value="promo">Codes promo</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des ventes</CardTitle>
              <CardDescription>
                Liste de tous les achats effectués sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Méthode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDate(purchase.purchased_at)}</TableCell>
                      <TableCell>Niveau {purchase.level}</TableCell>
                      <TableCell>{formatCurrency(Number(purchase.price_paid))}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={purchase.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {purchase.status === 'completed' ? 'Complété' : purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{purchase.payment_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo" className="space-y-4">
          {/* Créer un nouveau code promo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Créer un code promo
              </CardTitle>
              <CardDescription>
                Générez des codes promotionnels pour offrir l'accès gratuit aux certifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Code promo</Label>
                  <Input
                    id="promoCode"
                    placeholder="Ex: WELCOME2024"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    className="uppercase"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau concerné</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Niveau 1</SelectItem>
                      <SelectItem value="2">Niveau 2</SelectItem>
                      <SelectItem value="3">Niveau 3</SelectItem>
                      <SelectItem value="4">Niveau 4</SelectItem>
                      <SelectItem value="5">Niveau 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiration">Date d'expiration (optionnel)</Label>
                  <Input
                    id="expiration"
                    type="datetime-local"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button onClick={createPromoCode} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des codes promo */}
          <Card>
            <CardHeader>
              <CardTitle>Codes promo existants</CardTitle>
              <CardDescription>
                Gérez tous les codes promotionnels créés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead>Utilisé par</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-semibold">
                        {editingPromo?.id === promo.id ? (
                          <Input
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="uppercase font-mono"
                          />
                        ) : (
                          promo.code
                        )}
                      </TableCell>
                      <TableCell>
                        {editingPromo?.id === promo.id ? (
                          <Select value={editLevel} onValueChange={setEditLevel}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Niveau 1</SelectItem>
                              <SelectItem value="2">Niveau 2</SelectItem>
                              <SelectItem value="3">Niveau 3</SelectItem>
                              <SelectItem value="4">Niveau 4</SelectItem>
                              <SelectItem value="5">Niveau 5</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          `Niveau ${promo.level}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={promo.is_used ? 'secondary' : 'default'}
                        >
                          {promo.is_used ? 'Utilisé' : 'Disponible'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(promo.created_at)}</TableCell>
                      <TableCell>
                        {editingPromo?.id === promo.id ? (
                          <Input
                            type="datetime-local"
                            value={editExpiration}
                            onChange={(e) => setEditExpiration(e.target.value)}
                            className="w-48"
                          />
                        ) : (
                          promo.expires_at ? formatDate(promo.expires_at) : 'Jamais'
                        )}
                      </TableCell>
                      <TableCell>
                        {promo.used_by ? (
                          <span className="text-sm text-muted-foreground">
                            {promo.used_at ? formatDate(promo.used_at) : 'Utilisé'}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingPromo?.id === promo.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={updatePromoCode}
                              >
                                Sauvegarder
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditPromo(promo)}
                                disabled={promo.is_used}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deletePromoCode(promo.id)}
                                disabled={promo.is_used}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};