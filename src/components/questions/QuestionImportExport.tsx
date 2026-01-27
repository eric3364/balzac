import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Question {
  id: number;
  level: string | null;
  content: string | null;
  type: string | null;
  rule: string | null;
  answer: string | null;
  choices: string[] | null;
  explanation: string | null;
  created_at: string | null;
}

interface QuestionImportExportProps {
  questions: Question[];
  selectedQuestions: Set<number>;
  onImportComplete: () => void;
}

// Format CSV attendu
const CSV_HEADERS = ['level', 'type', 'content', 'rule', 'answer', 'choices', 'explanation'];
const CSV_HEADERS_WITH_ID = ['id', ...CSV_HEADERS];

export const QuestionImportExport: React.FC<QuestionImportExportProps> = ({
  questions,
  selectedQuestions,
  onImportComplete
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Fonction pour échapper les valeurs CSV
  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Si la valeur contient des virgules, des guillemets ou des retours à la ligne, l'entourer de guillemets
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Fonction pour parser une ligne CSV
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  // Export des questions sélectionnées ou toutes
  const handleExport = () => {
    const questionsToExport = selectedQuestions.size > 0
      ? questions.filter(q => selectedQuestions.has(q.id))
      : questions;

    if (questionsToExport.length === 0) {
      toast({
        title: "Aucune question à exporter",
        description: "Sélectionnez des questions ou exportez toutes les questions",
        variant: "destructive",
      });
      return;
    }

    // Créer le contenu CSV
    const csvLines: string[] = [];
    
    // En-têtes
    csvLines.push(CSV_HEADERS_WITH_ID.join(','));
    
    // Données
    questionsToExport.forEach(q => {
      const choicesStr = q.choices ? q.choices.join('|') : '';
      const line = [
        q.id,
        escapeCSV(q.level),
        escapeCSV(q.type),
        escapeCSV(q.content),
        escapeCSV(q.rule),
        escapeCSV(q.answer),
        escapeCSV(choicesStr),
        escapeCSV(q.explanation)
      ].join(',');
      csvLines.push(line);
    });

    // Télécharger le fichier
    const csvContent = csvLines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `questions_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: `${questionsToExport.length} question(s) exportée(s)`,
    });
  };

  // Ouvrir le dialogue de sélection de fichier
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Traiter le fichier importé
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier l'extension
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseImportFile(content);
    };
    reader.readAsText(file, 'UTF-8');
    
    // Reset input pour permettre de réimporter le même fichier
    e.target.value = '';
  };

  // Parser le fichier d'import
  const parseImportFile = (content: string) => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const errors: string[] = [];
    const preview: any[] = [];

    if (lines.length < 2) {
      errors.push("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
      setImportErrors(errors);
      setImportPreview([]);
      setIsImportDialogOpen(true);
      return;
    }

    // Vérifier les en-têtes
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const hasId = headers.includes('id');
    const requiredHeaders = hasId ? CSV_HEADERS_WITH_ID : CSV_HEADERS;
    
    // Vérifier que tous les headers requis sont présents
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
      errors.push(`En-têtes manquants: ${missingHeaders.join(', ')}`);
    }

    // Parser les lignes de données
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length < requiredHeaders.length) {
        errors.push(`Ligne ${i + 1}: nombre de colonnes insuffisant (${values.length}/${requiredHeaders.length})`);
        continue;
      }

      // Créer l'objet question
      const question: any = {};
      headers.forEach((header, index) => {
        if (header === 'choices' && values[index]) {
          // Convertir les choix séparés par | en tableau
          question.choices = values[index].split('|').map(c => c.trim()).filter(c => c);
        } else {
          question[header] = values[index] || null;
        }
      });

      // Validation des champs obligatoires
      if (!question.content?.trim()) {
        errors.push(`Ligne ${i + 1}: le contenu de la question est obligatoire`);
        continue;
      }
      if (!question.answer?.trim()) {
        errors.push(`Ligne ${i + 1}: la réponse est obligatoire`);
        continue;
      }

      preview.push(question);
    }

    setImportErrors(errors);
    setImportPreview(preview);
    setIsImportDialogOpen(true);
  };

  // Importer les questions validées
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      let successCount = 0;
      let updateCount = 0;
      let errorCount = 0;

      for (const question of importPreview) {
        const questionData = {
          level: question.level || null,
          type: question.type || null,
          content: question.content,
          rule: question.rule || null,
          answer: question.answer,
          choices: question.choices?.length > 0 ? question.choices : null,
          explanation: question.explanation || null
        };

        if (question.id) {
          // Mise à jour d'une question existante
          const { error } = await supabase
            .from('questions')
            .update(questionData)
            .eq('id', parseInt(question.id));

          if (error) {
            console.error('Erreur mise à jour:', error);
            errorCount++;
          } else {
            updateCount++;
          }
        } else {
          // Création d'une nouvelle question
          const { error } = await supabase
            .from('questions')
            .insert(questionData);

          if (error) {
            console.error('Erreur insertion:', error);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      toast({
        title: "Import terminé",
        description: `${successCount} créée(s), ${updateCount} mise(s) à jour, ${errorCount} erreur(s)`,
      });

      setIsImportDialogOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      onImportComplete();
    } catch (error) {
      console.error('Erreur import:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Télécharger le modèle CSV
  const handleDownloadTemplate = () => {
    const templateContent = `${CSV_HEADERS.join(',')}\nélémentaire,standard,"Quelle est la bonne orthographe ?","Accord du participe passé",A,"A|B|C|D","Explication de la règle"`;
    const blob = new Blob(['\ufeff' + templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele_import_questions.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Modèle téléchargé",
      description: "Utilisez ce modèle pour préparer votre import",
    });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="h-4 w-4 mr-2" />
          Importer
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exporter {selectedQuestions.size > 0 && `(${selectedQuestions.size})`}
        </Button>
      </div>

      {/* Dialog d'import */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import de questions
            </DialogTitle>
            <DialogDescription>
              Vérifiez les données avant de confirmer l'import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Erreurs */}
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreurs détectées ({importErrors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                    {importErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importErrors.length > 10 && (
                      <li>... et {importErrors.length - 10} autres erreurs</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Aperçu */}
            {importPreview.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{importPreview.length} question(s) prête(s) à importer</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 text-sm">
                    <p className="font-medium mb-2">Aperçu des premières questions :</p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {importPreview.slice(0, 5).map((q, index) => (
                        <li key={index} className="p-2 bg-muted rounded">
                          <p className="font-medium truncate">{q.content}</p>
                          <p className="text-xs text-muted-foreground">
                            Niveau: {q.level || 'N/A'} | Type: {q.type || 'N/A'} | Réponse: {q.answer}
                            {q.id && ` | ID: ${q.id} (mise à jour)`}
                          </p>
                        </li>
                      ))}
                      {importPreview.length > 5 && (
                        <li className="text-muted-foreground">
                          ... et {importPreview.length - 5} autres questions
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Format attendu */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Format CSV attendu :</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Colonnes : <code className="bg-background px-1 rounded">{CSV_HEADERS.join(', ')}</code>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>level</strong> : niveau de difficulté (élémentaire, intermédiaire, avancé...)</li>
                <li>• <strong>type</strong> : type de question (standard, complétion, correction...)</li>
                <li>• <strong>content</strong> : texte de la question (obligatoire)</li>
                <li>• <strong>rule</strong> : règle grammaticale associée</li>
                <li>• <strong>answer</strong> : réponse correcte (obligatoire)</li>
                <li>• <strong>choices</strong> : choix séparés par <code>|</code> (ex: A|B|C|D)</li>
                <li>• <strong>explanation</strong> : explication de la réponse</li>
              </ul>
              <Button variant="link" className="mt-2 p-0 h-auto" onClick={handleDownloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                Télécharger le modèle CSV
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmImport} 
              disabled={importPreview.length === 0 || isImporting}
            >
              {isImporting ? 'Import en cours...' : `Importer ${importPreview.length} question(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuestionImportExport;
