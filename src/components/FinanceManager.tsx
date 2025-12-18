import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Euro, Users, ShoppingCart, Gift, TrendingUp, Trash2, Edit, Settings, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminManager } from '@/components/AdminManager';

interface Purchase {
  id: string;
  level: number;
  price_paid: number;
  status: string;
  purchased_at: string;
  payment_method: string | null;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  promo_code?: string | null;
}

interface PromoCode {
  id: string;
  code: string;
  level: number;
  discount_percentage: number;
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

interface CertificationLevel {
  level_number: number;
  name: string;
  cert_name: string;
}

export const FinanceManager: React.FC = () => {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [certificationLevels, setCertificationLevels] = useState<CertificationLevel[]>([]);
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
  const [discountPercentage, setDiscountPercentage] = useState<string>('100');
  const [expirationDate, setExpirationDate] = useState('');
  
  // Edit promo code
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editLevel, setEditLevel] = useState<string>('');
  const [editDiscount, setEditDiscount] = useState<string>('');
  const [editExpiration, setEditExpiration] = useState('');

  // Stripe configuration
  const [stripeConfig, setStripeConfig] = useState({
    publishableKey: '',
    webhookSecret: '',
    accountId: '',
    bankAccount: {
      country: 'FR',
      currency: 'EUR',
      accountNumber: '',
      routingNumber: '',
      accountHolderName: '',
      accountHolderType: 'individual'
    }
  });

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

      // Charger les utilisateurs pour associer les noms
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, first_name, last_name');
      
      const usersMap = new Map(
        (usersData || []).map(u => [u.user_id, { first_name: u.first_name, last_name: u.last_name }])
      );

      if (purchasesError) throw purchasesError;
      
      // Charger les codes promo pour associer aux achats
      const { data: allPromoCodes } = await supabase
        .from('promo_codes')
        .select('*');
      
      const promoCodesMap = new Map(
        (allPromoCodes || []).map(pc => [pc.used_by, pc.code])
      );
      
      setPurchases((purchasesData || []).map(p => {
        const user = usersMap.get(p.user_id);
        return {
          ...p,
          payment_method: p.payment_method || 'stripe',
          first_name: user?.first_name,
          last_name: user?.last_name,
          promo_code: p.payment_method === 'promo_code' ? promoCodesMap.get(p.user_id) : null
        };
      }));

      // Charger les codes promo
      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) throw promoError;
      
      // Compter les utilisations de chaque code promo (achats avec payment_method = 'promo_code')
      const promoUsageCount = new Map<string, number>();
      (purchasesData || []).forEach(p => {
        if (p.payment_method === 'promo_code') {
          const code = promoCodesMap.get(p.user_id);
          if (code) {
            promoUsageCount.set(code, (promoUsageCount.get(code) || 0) + 1);
          }
        }
      });
      
      setPromoCodes((promoData || []).map(promo => ({
        ...promo,
        usage_count: promoUsageCount.get(promo.code) || 0
      })));

      // Charger les niveaux de certification actifs
      const { data: levelsData, error: levelsError } = await supabase
        .from('difficulty_levels')
        .select(`
          level_number,
          name,
          certificate_templates!inner(name)
        `)
        .eq('is_active', true)
        .eq('certificate_templates.is_active', true)
        .order('level_number');

      if (levelsError) throw levelsError;
      
      const formattedLevels = levelsData?.map(level => ({
        level_number: level.level_number,
        name: level.name,
        cert_name: (level.certificate_templates as any)?.[0]?.name || level.name
      })) || [];
      
      setCertificationLevels(formattedLevels);

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
    if (!newPromoCode.trim() || !selectedLevel || !discountPercentage) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const discountValue = parseInt(discountPercentage);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      toast({
        title: "Erreur",
        description: "Le pourcentage de réduction doit être entre 0 et 100.",
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
          discount_percentage: discountValue,
          expires_at: expirationDate ? new Date(expirationDate).toISOString() : null
        });

      if (error) throw error;

      toast({
        title: "Code promo créé",
        description: `Le code ${newPromoCode.toUpperCase()} a été créé avec succès.`,
      });

      setNewPromoCode('');
      setSelectedLevel('');
      setDiscountPercentage('100');
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
    setEditDiscount(promo.discount_percentage.toString());
    setEditExpiration(promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : '');
  };

  const cancelEdit = () => {
    setEditingPromo(null);
    setEditCode('');
    setEditLevel('');
    setEditDiscount('');
    setEditExpiration('');
  };

  const updatePromoCode = async () => {
    if (!editingPromo || !editCode.trim() || !editLevel || !editDiscount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const discountValue = parseInt(editDiscount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      toast({
        title: "Erreur",
        description: "Le pourcentage de réduction doit être entre 0 et 100.",
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
          discount_percentage: discountValue,
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
          <TabsTrigger value="stripe">Configuration Stripe</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
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
                    <TableHead>Acheteur</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Code promo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDate(purchase.purchased_at)}</TableCell>
                      <TableCell>
                        {purchase.first_name || purchase.last_name 
                          ? `${purchase.first_name || ''} ${purchase.last_name || ''}`.trim()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>Niveau {purchase.level}</TableCell>
                      <TableCell>{formatCurrency(Number(purchase.price_paid))}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={purchase.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {purchase.status === 'completed' ? 'Complété' : purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {purchase.payment_method === 'promo_code' ? 'Code promo' : 'Stripe'}
                      </TableCell>
                      <TableCell>
                        {purchase.promo_code ? (
                          <Badge variant="secondary" className="font-mono">
                            {purchase.promo_code}
                          </Badge>
                        ) : '—'}
                      </TableCell>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                      {certificationLevels.map((level) => (
                        <SelectItem key={level.level_number} value={level.level_number.toString()}>
                          Niveau {level.level_number} - {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discount">% de réduction</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                  />
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
                    <TableHead>Réduction</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead>Utilisé par</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun code promo créé pour le moment
                      </TableCell>
                    </TableRow>
                  ) : (
                    promoCodes.map((promo) => (
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
                              {certificationLevels.map((level) => (
                                <SelectItem key={level.level_number} value={level.level_number.toString()}>
                                  Niveau {level.level_number} - {level.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          `Niveau ${promo.level}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingPromo?.id === promo.id ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(e.target.value)}
                            className="w-20"
                          />
                        ) : (
                          <Badge variant="outline">
                            {promo.discount_percentage}%
                          </Badge>
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
                        <Badge variant={(promo as any).usage_count > 0 ? "secondary" : "outline"}>
                          {(promo as any).usage_count || 0} fois
                        </Badge>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-4">
          {/* Configuration des clés API Stripe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Clés API Stripe
              </CardTitle>
              <CardDescription>
                Configurez vos clés API Stripe pour le traitement des paiements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publishableKey">Clé publique</Label>
                  <Input
                    id="publishableKey"
                    placeholder="pk_test_..."
                    value={stripeConfig.publishableKey}
                    onChange={(e) => setStripeConfig(prev => ({ ...prev, publishableKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Secret du webhook</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    placeholder="whsec_..."
                    value={stripeConfig.webhookSecret}
                    onChange={(e) => setStripeConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">ID du compte Stripe Connect (optionnel)</Label>
                <Input
                  id="accountId"
                  placeholder="acct_..."
                  value={stripeConfig.accountId}
                  onChange={(e) => setStripeConfig(prev => ({ ...prev, accountId: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuration du compte bancaire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Compte bancaire
              </CardTitle>
              <CardDescription>
                Configurez les informations de votre compte bancaire pour recevoir les paiements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Select 
                    value={stripeConfig.bankAccount.country} 
                    onValueChange={(value) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, country: value } 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="BE">Belgique</SelectItem>
                      <SelectItem value="CH">Suisse</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={stripeConfig.bankAccount.currency} 
                    onValueChange={(value) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, currency: value } 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Numéro de compte (IBAN)</Label>
                  <Input
                    id="accountNumber"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    value={stripeConfig.bankAccount.accountNumber}
                    onChange={(e) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, accountNumber: e.target.value } 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Code BIC/SWIFT</Label>
                  <Input
                    id="routingNumber"
                    placeholder="BNPAFRPP"
                    value={stripeConfig.bankAccount.routingNumber}
                    onChange={(e) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, routingNumber: e.target.value } 
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Nom du titulaire</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="Nom complet ou nom de l'entreprise"
                    value={stripeConfig.bankAccount.accountHolderName}
                    onChange={(e) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, accountHolderName: e.target.value } 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderType">Type de compte</Label>
                  <Select 
                    value={stripeConfig.bankAccount.accountHolderType} 
                    onValueChange={(value) => setStripeConfig(prev => ({ 
                      ...prev, 
                      bankAccount: { ...prev.bankAccount, accountHolderType: value } 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Particulier</SelectItem>
                      <SelectItem value="company">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Sauvegarder la configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informations et liens utiles */}
          <Card>
            <CardHeader>
              <CardTitle>Ressources Stripe</CardTitle>
              <CardDescription>
                Liens utiles pour configurer votre compte Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Dashboard Stripe</h4>
                  <p className="text-sm text-muted-foreground">Accédez à votre tableau de bord Stripe</p>
                </div>
                <Button variant="outline" asChild>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                    Ouvrir
                  </a>
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Clés API</h4>
                  <p className="text-sm text-muted-foreground">Récupérez vos clés API publiques et secrètes</p>
                </div>
                <Button variant="outline" asChild>
                  <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                    Voir les clés
                  </a>
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Webhooks</h4>
                  <p className="text-sm text-muted-foreground">Configurez les webhooks pour les événements de paiement</p>
                </div>
                <Button variant="outline" asChild>
                  <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer">
                    Configurer
                  </a>
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Documentation</h4>
                  <p className="text-sm text-muted-foreground">Guide complet d'intégration Stripe</p>
                </div>
                <Button variant="outline" asChild>
                  <a href="https://stripe.com/docs" target="_blank" rel="noopener noreferrer">
                    Consulter
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="administration" className="space-y-4">
          <AdminManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};