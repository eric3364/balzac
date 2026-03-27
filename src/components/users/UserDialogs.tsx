import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { SCHOOLS, CLASS_LEVELS, CITIES, School, ClassLevel, City } from '@/constants/userData';

export interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  school: School | '';
  class_name: ClassLevel | '';
  city: City | '';
  is_active: boolean;
  password?: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  userForm: UserFormData;
  onFormChange: (form: UserFormData) => void;
  onSave: () => void;
}

export const UserFormDialog = ({
  open, onOpenChange, isEditing, userForm, onFormChange, onSave,
}: UserFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'apprenant' : 'Ajouter un apprenant'}</DialogTitle>
          <DialogDescription>Remplissez les informations de l'apprenant</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={userForm.email}
              onChange={(e) => onFormChange({ ...userForm, email: e.target.value })}
              placeholder="email@exemple.com" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" value={userForm.first_name}
                onChange={(e) => onFormChange({ ...userForm, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" value={userForm.last_name}
                onChange={(e) => onFormChange({ ...userForm, last_name: e.target.value })} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="school">École</Label>
            <Select value={userForm.school}
              onValueChange={(value) => onFormChange({ ...userForm, school: value as School | '' })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une école" /></SelectTrigger>
              <SelectContent>
                {SCHOOLS.map(school => (<SelectItem key={school} value={school}>{school}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="class_name">Classe</Label>
            <Select value={userForm.class_name}
              onValueChange={(value) => onFormChange({ ...userForm, class_name: value as ClassLevel | '' })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
              <SelectContent>
                {CLASS_LEVELS.map(cn => (<SelectItem key={cn} value={cn}>{cn}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Select value={userForm.city}
              onValueChange={(value) => onFormChange({ ...userForm, city: value as City | '' })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
              <SelectContent>
                {CITIES.map(city => (<SelectItem key={city} value={city}>{city}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe (optionnel)</Label>
              <Input id="password" type="password" value={userForm.password || ''}
                onChange={(e) => onFormChange({ ...userForm, password: e.target.value })}
                placeholder="Laisser vide pour mot de passe temporaire" />
              <p className="text-sm text-muted-foreground">
                Si aucun mot de passe n'est défini, un mot de passe temporaire sera généré.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave} disabled={!userForm.email}>{isEditing ? 'Modifier' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Bulk delete dialog
interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const BulkDeleteDialog = ({
  open, onOpenChange, count, confirmText, onConfirmTextChange, onConfirm, isDeleting,
}: BulkDeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Supprimer {count} apprenant(s)</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Pour confirmer, écrivez exactement :
            <br /><span className="font-mono font-bold text-destructive">oui je confirme la suppression !</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-text">Confirmation</Label>
            <Input id="confirm-text" value={confirmText} onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="oui je confirme la suppression !" className="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); onConfirmTextChange(''); }}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm}
            disabled={isDeleting || confirmText !== 'oui je confirme la suppression !'}>
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Import duplicates dialog
interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateEmails: string[];
  newUsersCount: number;
  onCancel: () => void;
  onImport: () => void;
}

export const DuplicateDialog = ({
  open, onOpenChange, duplicateEmails, newUsersCount, onCancel, onImport,
}: DuplicateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-amber-600">Attention : Doublons détectés</DialogTitle>
          <DialogDescription>Certains étudiants de cette liste existent déjà dans la base de données.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              {duplicateEmails.length} email(s) déjà existant(s) :
            </p>
            <div className="max-h-32 overflow-y-auto">
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {duplicateEmails.slice(0, 10).map((email, index) => (<li key={index}>• {email}</li>))}
                {duplicateEmails.length > 10 && (<li className="italic">... et {duplicateEmails.length - 10} autre(s)</li>)}
              </ul>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {newUsersCount} nouvel(aux) apprenant(s) prêt(s) à être importé(s)
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={onImport} disabled={newUsersCount === 0}>
            Importer uniquement les nouveaux ({newUsersCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Normalization dialog
interface NormalizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmatchedValues: { field: string; value: string; suggestions: string[] }[];
  normalizationChoices: Record<string, string>;
  customInputValues: Record<string, string>;
  onChoiceChange: (key: string, value: string) => void;
  onCustomInputChange: (key: string, value: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

export const NormalizationDialog = ({
  open, onOpenChange, unmatchedValues,
  normalizationChoices, customInputValues,
  onChoiceChange, onCustomInputChange, onApply, onCancel,
}: NormalizationDialogProps) => {
  const fieldLabels: Record<string, string> = { school: 'École', class_name: 'Classe', city: 'Ville' };

  const isDisabled = unmatchedValues.some(item => {
    const choiceKey = `${item.field}:${item.value}`;
    const choice = normalizationChoices[choiceKey];
    if (!choice) return true;
    if (choice === '__custom__' && !customInputValues[choiceKey]?.trim()) return true;
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-amber-600">Valeurs non reconnues</DialogTitle>
          <DialogDescription>
            Certaines valeurs du fichier d'importation ne correspondent pas aux données de référence.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {unmatchedValues.map((item, index) => {
            const choiceKey = `${item.field}:${item.value}`;
            const isCustom = normalizationChoices[choiceKey] === '__custom__';
            return (
              <div key={index} className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">
                  {fieldLabels[item.field] || item.field} : <span className="text-amber-600">"{item.value}"</span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">Sélectionnez la valeur correspondante ou ajoutez-en une nouvelle :</p>
                <Select value={normalizationChoices[choiceKey] || ''}
                  onValueChange={(value) => {
                    onChoiceChange(choiceKey, value);
                    if (value === '__custom__' && !customInputValues[choiceKey]) {
                      const formatted = item.value.charAt(0).toUpperCase() + item.value.slice(1).toLowerCase();
                      onCustomInputChange(choiceKey, formatted);
                    }
                  }}>
                  <SelectTrigger><SelectValue placeholder="Choisir une valeur..." /></SelectTrigger>
                  <SelectContent>
                    {item.suggestions.map((s, i) => (<SelectItem key={i} value={s}>{s}</SelectItem>))}
                    <SelectItem value="__custom__" className="text-primary font-medium border-t mt-1 pt-2">
                      <span className="flex items-center gap-2"><Plus className="h-4 w-4" />Autre (saisir manuellement)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isCustom && (
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Nouvelle valeur pour {fieldLabels[item.field]?.toLowerCase() || item.field} :
                    </Label>
                    <Input value={customInputValues[choiceKey] || ''}
                      onChange={(e) => onCustomInputChange(choiceKey, e.target.value)}
                      placeholder={`Saisir une nouvelle ${fieldLabels[item.field]?.toLowerCase() || 'valeur'}...`}
                      className="mt-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={onApply} disabled={isDisabled}>Appliquer et continuer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
