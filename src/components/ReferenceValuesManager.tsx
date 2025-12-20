import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, School, MapPin, GraduationCap, Database } from 'lucide-react';
import { useReferenceValues, ReferenceType } from '@/hooks/useReferenceValues';
import { SCHOOLS, CLASS_LEVELS, CITIES } from '@/constants/userData';
import { useToast } from '@/hooks/use-toast';

export const ReferenceValuesManager = () => {
  const { toast } = useToast();
  const { customValues, getAllSchools, getAllClasses, getAllCities, addReferenceValue, removeReferenceValue, loading } = useReferenceValues();
  
  const [activeTab, setActiveTab] = useState<ReferenceType>('school');
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [valueToDelete, setValueToDelete] = useState<{ id: string; value: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const staticValues = {
    school: [...SCHOOLS],
    class_name: [...CLASS_LEVELS],
    city: [...CITIES]
  };

  const tabConfig = {
    school: { 
      label: 'Écoles', 
      icon: School, 
      getAllValues: getAllSchools,
      placeholder: 'Nouvelle école...'
    },
    class_name: { 
      label: 'Classes', 
      icon: GraduationCap, 
      getAllValues: getAllClasses,
      placeholder: 'Nouvelle classe...'
    },
    city: { 
      label: 'Villes', 
      icon: MapPin, 
      getAllValues: getAllCities,
      placeholder: 'Nouvelle ville...'
    }
  };

  const currentCustomValues = customValues.filter(v => v.type === activeTab);
  const currentStaticValues = staticValues[activeTab];
  const currentConfig = tabConfig[activeTab];

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    setIsAdding(true);
    try {
      const success = await addReferenceValue(activeTab, newValue.trim());
      if (success) {
        toast({
          title: "Valeur ajoutée",
          description: `"${newValue.trim()}" a été ajouté aux ${currentConfig.label.toLowerCase()}.`
        });
        setNewValue('');
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter cette valeur.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding value:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (id: string, value: string) => {
    setValueToDelete({ id, value });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!valueToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await removeReferenceValue(valueToDelete.id);
      if (success) {
        toast({
          title: "Valeur supprimée",
          description: `"${valueToDelete.value}" a été supprimé.`
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer cette valeur.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting value:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setValueToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Valeurs de référence
        </CardTitle>
        <CardDescription>
          Gérez les écoles, classes et villes disponibles pour les apprenants.
          Les valeurs par défaut (statiques) ne peuvent pas être supprimées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReferenceType)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {Object.entries(tabConfig).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <config.icon className="h-4 w-4" />
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(tabConfig).map(([key, config]) => (
            <TabsContent key={key} value={key} className="space-y-6">
              {/* Formulaire d'ajout */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`new-${key}`} className="sr-only">
                    {config.placeholder}
                  </Label>
                  <Input
                    id={`new-${key}`}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={config.placeholder}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <Button onClick={handleAdd} disabled={isAdding || !newValue.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {/* Valeurs personnalisées */}
              {currentCustomValues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Personnalisées</Badge>
                    {currentCustomValues.length} valeur(s) ajoutée(s)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentCustomValues.map((value) => (
                      <Badge 
                        key={value.id} 
                        variant="outline"
                        className="px-3 py-1.5 text-sm flex items-center gap-2 bg-primary/5 border-primary/20"
                      >
                        {value.value}
                        <button
                          onClick={() => handleDeleteClick(value.id, value.value)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Valeurs statiques */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Par défaut</Badge>
                  {currentStaticValues.length} valeur(s) intégrée(s)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentStaticValues.map((value) => (
                    <Badge 
                      key={value} 
                      variant="secondary"
                      className="px-3 py-1.5 text-sm"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Résumé */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Total : <strong>{config.getAllValues().length}</strong> {config.label.toLowerCase()} disponibles
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "<strong>{valueToDelete?.value}</strong>" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
