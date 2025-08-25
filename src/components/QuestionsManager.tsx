import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Search, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: number;
  level: number | null;
  content: string | null;
  type: string | null;
  rule: string | null;
  answer: string | null;
  choices: string[] | null;
  explanation: string | null;
  created_at: string | null;
}

interface DifficultyLevel {
  id: string;
  level_number: number;
  name: string;
  color: string;
}

interface QuestionsManagerProps {
  difficultyLevels: DifficultyLevel[];
}

export const QuestionsManager: React.FC<QuestionsManagerProps> = ({ difficultyLevels }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const questionsPerPage = 20;

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, selectedLevel, selectedType]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('level', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setQuestions((data || []).map(q => ({
        ...q,
        choices: null // Pas de champ choices dans la base de données
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(q => 
        (q.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.answer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.rule?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(q => q.level === parseInt(selectedLevel));
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(q => q.type === selectedType);
    }

    setFilteredQuestions(filtered);
    setCurrentPage(1);
  };

  const deleteQuestion = async (questionId: number) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Question supprimée avec succès",
      });

      loadQuestions();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la question",
        variant: "destructive",
      });
    }
  };

  const saveQuestion = async (questionData: Partial<Question>) => {
    try {
      if (editingQuestion) {
        // Modification
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Question modifiée avec succès",
        });
      } else {
        // Création
        const { error } = await supabase
          .from('questions')
          .insert(questionData);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Question créée avec succès",
        });
      }

      setIsDialogOpen(false);
      setEditingQuestion(null);
      loadQuestions();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la question",
        variant: "destructive",
      });
    }
  };

  const questionTypes = [...new Set(questions.map(q => q.type))].filter(Boolean);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const currentQuestions = filteredQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  const getLevelInfo = (levelNumber: number) => {
    return difficultyLevels.find(l => l.level_number === levelNumber);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestion des questions ({filteredQuestions.length})
            </CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingQuestion(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une question
              </Button>
            </DialogTrigger>
            <QuestionDialog
              question={editingQuestion}
              difficultyLevels={difficultyLevels}
              onSave={saveQuestion}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingQuestion(null);
              }}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans le contenu, réponse ou règle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {difficultyLevels.map((level) => (
                <SelectItem key={level.id} value={level.level_number.toString()}>
                  Niveau {level.level_number} - {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {questionTypes.map((type) => (
                <SelectItem key={type} value={type || ''}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tableau des questions */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="max-w-md">Question</TableHead>
                <TableHead>Règle</TableHead>
                <TableHead>Réponse</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentQuestions.map((question) => {
                const levelInfo = getLevelInfo(question.level || 1);
                return (
                  <TableRow key={question.id}>
                    <TableCell className="font-mono text-sm">
                      {question.id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: levelInfo?.color + '20',
                          borderColor: levelInfo?.color,
                          color: levelInfo?.color
                        }}
                      >
                        Niveau {question.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{question.type || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate" title={question.content || ''}>
                        {question.content || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-32">
                      <p className="truncate text-sm text-muted-foreground" title={question.rule || ''}>
                        {question.rule || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-32">
                      <p className="truncate font-medium" title={question.answer || ''}>
                        {question.answer || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(question);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
                              deleteQuestion(question.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages} ({filteredQuestions.length} questions)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface QuestionDialogProps {
  question: Question | null;
  difficultyLevels: DifficultyLevel[];
  onSave: (data: Partial<Question>) => void;
  onCancel: () => void;
}

const QuestionDialog: React.FC<QuestionDialogProps> = ({
  question,
  difficultyLevels,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    content: '',
    type: 'multiple_choice',
    level: 1,
    rule: '',
    answer: '',
    choices: [] as string[],
    explanation: ''
  });

  useEffect(() => {
    if (question) {
      setFormData({
        content: question.content || '',
        type: question.type || 'multiple_choice',
        level: question.level || 1,
        rule: question.rule || '',
        answer: question.answer || '',
        choices: question.choices || [],
        explanation: question.explanation || ''
      });
    } else {
      setFormData({
        content: '',
        type: 'multiple_choice',
        level: 1,
        rule: '',
        answer: '',
        choices: [],
        explanation: ''
      });
    }
  }, [question]);

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...formData.choices];
    newChoices[index] = value;
    setFormData({ ...formData, choices: newChoices });
  };

  const addChoice = () => {
    setFormData({ ...formData, choices: [...formData.choices, ''] });
  };

  const removeChoice = (index: number) => {
    const newChoices = formData.choices.filter((_, i) => i !== index);
    setFormData({ ...formData, choices: newChoices });
  };

  const handleSubmit = () => {
    if (!formData.content.trim() || !formData.answer.trim()) {
      return;
    }

    onSave({
      content: formData.content,
      type: formData.type,
      level: formData.level,
      rule: formData.rule || null,
      answer: formData.answer,
      choices: formData.choices.length > 0 ? formData.choices : null,
      explanation: formData.explanation || null
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {question ? 'Modifier la question' : 'Ajouter une nouvelle question'}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Niveau</Label>
            <Select
              value={formData.level.toString()}
              onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => (
                  <SelectItem key={level.id} value={level.level_number.toString()}>
                    Niveau {level.level_number} - {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Choix multiple</SelectItem>
                <SelectItem value="open_question">Question ouverte</SelectItem>
                <SelectItem value="true_false">Vrai/Faux</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question *</Label>
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Saisissez le contenu de la question..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Règle (optionnel)</Label>
          <Input
            value={formData.rule}
            onChange={(e) => setFormData({ ...formData, rule: e.target.value })}
            placeholder="Règle grammaticale ou thématique..."
          />
        </div>

        {formData.type === 'multiple_choice' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Choix de réponse</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChoice}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un choix
              </Button>
            </div>
            {formData.choices.map((choice, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                  placeholder={`Choix ${index + 1}...`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChoice(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label>Réponse correcte *</Label>
          <Input
            value={formData.answer}
            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            placeholder="Réponse correcte..."
          />
        </div>

        <div className="space-y-2">
          <Label>Explication (optionnel)</Label>
          <Textarea
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            placeholder="Explication de la réponse..."
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSubmit}>
          {question ? 'Modifier' : 'Créer'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default QuestionsManager;