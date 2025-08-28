import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit2, Trash2, Settings, Award, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CertificationBadge } from '@/components/CertificationBadge';
import { CustomBadgeUploader } from '@/components/CustomBadgeUploader';

interface LevelWithCertificate {
  // Niveau de difficulté
  level_id: string;
  level_number: number;
  level_name: string;
  level_description: string;
  level_color: string;
  level_is_active: boolean;
  level_created_at: string;
  level_updated_at: string;
  
  // Certificat associé
  cert_id?: string;
  cert_name: string;
  cert_description: string;
  cert_title: string;
  cert_subtitle: string;
  cert_text: string;
  cert_background_color: string;
  cert_border_color: string;
  cert_text_color: string;
  min_score_required: number;
  badge_icon: string;
  badge_color: string;
  badge_background_color: string;
  badge_size: string;
  custom_badge_url?: string;
  price_euros: number;
  free_sessions: number;
  cert_is_active: boolean;
  feature_1_text: string;
  feature_2_text: string;
  feature_3_text: string;
}

const DEFAULT_LEVEL: Partial<LevelWithCertificate> = {
  level_name: '',
  level_description: '',
  level_color: '#6366f1',
  level_is_active: true,
  cert_name: '',
  cert_description: '',
  cert_title: '',
  cert_subtitle: '',
  cert_text: 'Félicitations ! Vous avez obtenu cette certification avec succès.',
  cert_background_color: '#ffffff',
  cert_border_color: '#6366f1',
  cert_text_color: '#000000',
  min_score_required: 70,
  badge_icon: 'award',
  badge_color: '#6366f1',
  badge_background_color: '#ffffff',
  badge_size: 'medium',
  price_euros: 10,
  free_sessions: 3,
  cert_is_active: true,
  feature_1_text: '',
  feature_2_text: '',
  feature_3_text: ''
};

export const LevelsAndCertificatesManager = () => {
  const { toast } = useToast();
  const [levels, setLevels] = useState<LevelWithCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState<LevelWithCertificate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLevelsAndCertificates();
  }, []);

  const loadLevelsAndCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select(`
          id,
          level_number,
          name,
          description,
          color,
          is_active,
          created_at,
          updated_at,
          certificate_templates (
            id,
            name,
            description,
            certificate_title,
            certificate_subtitle,
            certificate_text,
            certificate_background_color,
            certificate_border_color,
            certificate_text_color,
            min_score_required,
            badge_icon,
            badge_color,
            badge_background_color,
            badge_size,
            custom_badge_url,
            price_euros,
            free_sessions,
            is_active,
            feature_1_text,
            feature_2_text,
            feature_3_text
          )
        `)
        .order('level_number', { ascending: true });

      if (error) throw error;

      const transformedLevels: LevelWithCertificate[] = (data || []).map(level => {
        const certTemplates = Array.isArray(level.certificate_templates) ? level.certificate_templates : [];
        const cert = certTemplates.length > 0 ? certTemplates[0] : null;
        return {
          level_id: level.id,
          level_number: level.level_number,
          level_name: level.name,
          level_description: level.description || '',
          level_color: level.color || '#6366f1',
          level_is_active: level.is_active,
          level_created_at: level.created_at,
          level_updated_at: level.updated_at,
          
          cert_id: cert?.id,
          cert_name: cert?.name || '',
          cert_description: cert?.description || '',
          cert_title: cert?.certificate_title || '',
          cert_subtitle: cert?.certificate_subtitle || '',
          cert_text: cert?.certificate_text || '',
          cert_background_color: cert?.certificate_background_color || '#ffffff',
          cert_border_color: cert?.certificate_border_color || '#6366f1',
          cert_text_color: cert?.certificate_text_color || '#000000',
          min_score_required: cert?.min_score_required || 70,
          badge_icon: cert?.badge_icon || 'award',
          badge_color: cert?.badge_color || '#6366f1',
          badge_background_color: cert?.badge_background_color || '#ffffff',
          badge_size: cert?.badge_size || 'medium',
          custom_badge_url: cert?.custom_badge_url || '',
          price_euros: cert?.price_euros || 10,
          free_sessions: cert?.free_sessions || 3,
          cert_is_active: cert?.is_active || true,
          feature_1_text: cert?.feature_1_text || '',
          feature_2_text: cert?.feature_2_text || '',
          feature_3_text: cert?.feature_3_text || ''
        };
      });

      setLevels(transformedLevels);
    } catch (error) {
      console.error('Erreur lors du chargement des niveaux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les niveaux de difficulté.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    const nextLevelNumber = Math.max(...levels.map(l => l.level_number), 0) + 1;
    setEditingLevel({
      ...DEFAULT_LEVEL,
      level_number: nextLevelNumber,
      cert_name: `Certification Niveau ${nextLevelNumber}`,
      cert_title: `Certification Niveau ${nextLevelNumber}`,
      level_name: `Niveau ${nextLevelNumber}`
    } as LevelWithCertificate);
    setIsDialogOpen(true);
  };

  const openEditDialog = (level: LevelWithCertificate) => {
    setEditingLevel({ ...level });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingLevel(null);
    setIsDialogOpen(false);
  };

  const saveLevel = async () => {
    if (!editingLevel) return;

    setSaving(true);
    try {
      // 1. Créer ou mettre à jour le niveau de difficulté
      const levelData = {
        level_number: editingLevel.level_number,
        name: editingLevel.level_name,
        description: editingLevel.level_description,
        color: editingLevel.level_color,
        is_active: editingLevel.level_is_active
      };

      let levelId = editingLevel.level_id;

      if (levelId) {
        // Mise à jour
        const { error: levelError } = await supabase
          .from('difficulty_levels')
          .update(levelData)
          .eq('id', levelId);
        
        if (levelError) throw levelError;
      } else {
        // Création
        const { data: newLevel, error: levelError } = await supabase
          .from('difficulty_levels')
          .insert(levelData)
          .select()
          .single();
        
        if (levelError) throw levelError;
        levelId = newLevel.id;
      }

      // 2. Créer ou mettre à jour le modèle de certificat
      const certData = {
        difficulty_level_id: levelId,
        name: editingLevel.cert_name,
        description: editingLevel.cert_description,
        certificate_title: editingLevel.cert_title,
        certificate_subtitle: editingLevel.cert_subtitle,
        certificate_text: editingLevel.cert_text,
        certificate_background_color: editingLevel.cert_background_color,
        certificate_border_color: editingLevel.cert_border_color,
        certificate_text_color: editingLevel.cert_text_color,
        min_score_required: editingLevel.min_score_required,
        badge_icon: editingLevel.badge_icon,
        badge_color: editingLevel.badge_color,
        badge_background_color: editingLevel.badge_background_color,
        badge_size: editingLevel.badge_size,
        custom_badge_url: editingLevel.custom_badge_url || null,
        price_euros: editingLevel.price_euros,
        free_sessions: editingLevel.free_sessions,
        is_active: editingLevel.cert_is_active,
        feature_1_text: editingLevel.feature_1_text,
        feature_2_text: editingLevel.feature_2_text,
        feature_3_text: editingLevel.feature_3_text
      };

      if (editingLevel.cert_id) {
        // Mise à jour du certificat existant
        const { error: certError } = await supabase
          .from('certificate_templates')
          .update(certData)
          .eq('id', editingLevel.cert_id);
        
        if (certError) throw certError;
      } else {
        // Vérifier s'il existe déjà un certificat pour ce niveau
        const { data: existingCert } = await supabase
          .from('certificate_templates')
          .select('id')
          .eq('difficulty_level_id', levelId)
          .single();

        if (existingCert) {
          // Mettre à jour le certificat existant
          const { error: certError } = await supabase
            .from('certificate_templates')
            .update(certData)
            .eq('id', existingCert.id);
          
          if (certError) throw certError;
        } else {
          // Créer un nouveau certificat
          const { error: certError } = await supabase
            .from('certificate_templates')
            .insert(certData);
          
          if (certError) throw certError;
        }
      }

      toast({
        title: "Succès",
        description: `Niveau ${editingLevel.level_id ? 'mis à jour' : 'créé'} avec succès.`,
      });

      closeDialog();
      loadLevelsAndCertificates();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le niveau.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteLevel = async (level: LevelWithCertificate) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le niveau ${level.level_number} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      // Supprimer d'abord le certificat associé
      if (level.cert_id) {
        const { error: certError } = await supabase
          .from('certificate_templates')
          .delete()
          .eq('id', level.cert_id);
        
        if (certError) throw certError;
      }

      // Puis supprimer le niveau
      const { error: levelError } = await supabase
        .from('difficulty_levels')
        .delete()
        .eq('id', level.level_id);
      
      if (levelError) throw levelError;

      toast({
        title: "Succès",
        description: "Niveau supprimé avec succès.",
      });

      loadLevelsAndCertificates();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le niveau.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Niveaux de difficulté & Certificats
            </CardTitle>
            <CardDescription>
              Gestion unifiée des niveaux de difficulté et de leurs certificats associés
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau niveau
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {levels.length > 0 ? (
          <div className="space-y-4">
            {levels.map((level) => (
              <div key={level.level_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: level.level_color }}
                    />
                    <div>
                      <h3 className="font-semibold">Niveau {level.level_number}: {level.level_name}</h3>
                      <p className="text-sm text-muted-foreground">{level.level_description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={level.level_is_active ? "default" : "secondary"}>
                      {level.level_is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(level)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteLevel(level)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-3" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificat: {level.cert_name}
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Score requis:</span> {level.min_score_required}%</p>
                      <p><span className="font-medium">Prix:</span> {level.price_euros}€</p>
                      <p><span className="font-medium">Sessions gratuites:</span> {level.free_sessions}</p>
                    </div>
                    
                    {/* Affichage des lignes commerciales */}
                    {(level.feature_1_text || level.feature_2_text || level.feature_3_text) && (
                      <div className="mt-3">
                        <p className="font-medium text-sm mb-1">Arguments commerciaux:</p>
                        <ul className="text-xs space-y-1">
                          {level.feature_1_text && (
                            <li className="flex items-start gap-1">
                              <span className="text-green-600">✓</span>
                              <span>{level.feature_1_text}</span>
                            </li>
                          )}
                          {level.feature_2_text && (
                            <li className="flex items-start gap-1">
                              <span className="text-green-600">✓</span>
                              <span>{level.feature_2_text}</span>
                            </li>
                          )}
                          {level.feature_3_text && (
                            <li className="flex items-start gap-1">
                              <span className="text-green-600">✓</span>
                              <span>{level.feature_3_text}</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2">Aperçu du badge:</p>
                      <CertificationBadge
                        icon={level.badge_icon}
                        color={level.badge_color}
                        backgroundColor={level.badge_background_color}
                        size={level.badge_size as 'small' | 'medium' | 'large'}
                        customUrl={level.custom_badge_url || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun niveau de difficulté configuré</p>
            <Button onClick={openCreateDialog} className="mt-4">
              Créer le premier niveau
            </Button>
          </div>
        )}

        {/* Dialog de création/édition */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLevel?.level_id ? 'Modifier' : 'Créer'} un niveau de difficulté
              </DialogTitle>
              <DialogDescription>
                Configurez le niveau de difficulté et son certificat associé
              </DialogDescription>
            </DialogHeader>

            {editingLevel && (
              <div className="space-y-6">
                {/* Configuration du niveau */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Niveau de difficulté</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="level-number">Numéro du niveau</Label>
                      <Input
                        id="level-number"
                        type="number"
                        min="1"
                        value={editingLevel.level_number}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          level_number: parseInt(e.target.value) || 1
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level-name">Nom du niveau</Label>
                      <Input
                        id="level-name"
                        value={editingLevel.level_name}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          level_name: e.target.value
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level-description">Description</Label>
                      <Textarea
                        id="level-description"
                        value={editingLevel.level_description}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          level_description: e.target.value
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level-color">Couleur</Label>
                      <Input
                        id="level-color"
                        type="color"
                        value={editingLevel.level_color}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          level_color: e.target.value
                        } : null)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="level-active"
                      checked={editingLevel.level_is_active}
                      onCheckedChange={(checked) => setEditingLevel(prev => prev ? {
                        ...prev,
                        level_is_active: checked
                      } : null)}
                    />
                    <Label htmlFor="level-active">Niveau actif</Label>
                  </div>
                </div>

                <Separator />

                {/* Configuration du certificat */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Certificat associé</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cert-name">Nom du certificat</Label>
                      <Input
                        id="cert-name"
                        value={editingLevel.cert_name}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          cert_name: e.target.value
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cert-title">Titre du certificat</Label>
                      <Input
                        id="cert-title"
                        value={editingLevel.cert_title}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          cert_title: e.target.value
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min-score">Score minimum requis (%)</Label>
                      <Input
                        id="min-score"
                        type="number"
                        min="0"
                        max="100"
                        value={editingLevel.min_score_required}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          min_score_required: parseInt(e.target.value) || 70
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Prix (€)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingLevel.price_euros}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          price_euros: parseFloat(e.target.value) || 0
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="free-sessions">Sessions gratuites</Label>
                      <Input
                        id="free-sessions"
                        type="number"
                        min="0"
                        value={editingLevel.free_sessions}
                        onChange={(e) => setEditingLevel(prev => prev ? {
                          ...prev,
                          free_sessions: parseInt(e.target.value) || 0
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="badge-icon">Icône du badge</Label>
                      <Select
                        value={editingLevel.badge_icon}
                        onValueChange={(value) => setEditingLevel(prev => prev ? {
                          ...prev,
                          badge_icon: value
                        } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="award">Award</SelectItem>
                          <SelectItem value="trophy">Trophy</SelectItem>
                          <SelectItem value="medal">Medal</SelectItem>
                          <SelectItem value="crown">Crown</SelectItem>
                          <SelectItem value="star">Star</SelectItem>
                          <SelectItem value="shield">Shield</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                   </div>

                   {/* Section Lignes commerciales */}
                   <Separator />
                   <div className="space-y-4">
                     <h4 className="text-md font-semibold">Lignes commerciales</h4>
                     <p className="text-sm text-muted-foreground">
                       Ajoutez jusqu'à 3 arguments commerciaux pour promouvoir ce niveau
                     </p>
                     <div className="space-y-3">
                       <div className="space-y-2">
                         <Label htmlFor="feature1">Ligne commerciale 1</Label>
                         <Input
                           id="feature1"
                           placeholder="Ex: Accès illimité aux ressources premium"
                           value={editingLevel.feature_1_text}
                           onChange={(e) => setEditingLevel(prev => prev ? {
                             ...prev,
                             feature_1_text: e.target.value
                           } : null)}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="feature2">Ligne commerciale 2</Label>
                         <Input
                           id="feature2"
                           placeholder="Ex: Support personnalisé par email"
                           value={editingLevel.feature_2_text}
                           onChange={(e) => setEditingLevel(prev => prev ? {
                             ...prev,
                             feature_2_text: e.target.value
                           } : null)}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="feature3">Ligne commerciale 3</Label>
                         <Input
                           id="feature3"
                           placeholder="Ex: Certificat reconnu par l'industrie"
                           value={editingLevel.feature_3_text}
                           onChange={(e) => setEditingLevel(prev => prev ? {
                             ...prev,
                             feature_3_text: e.target.value
                           } : null)}
                         />
                       </div>
                     </div>
                   </div>

                  {/* Section Badge personnalisé */}
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold">Badge personnalisé</h4>
                    <CustomBadgeUploader
                      currentBadgeUrl={editingLevel.custom_badge_url}
                      onBadgeChange={(url) => setEditingLevel(prev => prev ? {
                        ...prev,
                        custom_badge_url: url || ''
                      } : null)}
                      levelNumber={editingLevel.level_number}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={saveLevel} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};