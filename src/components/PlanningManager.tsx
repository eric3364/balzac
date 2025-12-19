import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Edit2, Trash2, Target, Users, School, GraduationCap, MapPin, UserCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlanningObjectives, PlanningObjective } from '@/hooks/usePlanningObjectives';
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels';
import { CITIES } from '@/constants/userData';
import { format, formatDistanceToNow, isPast, differenceInDays, differenceInWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mapping des niveaux numériques vers les noms de niveau en base
const LEVEL_NAME_MAP: Record<number, string> = {
  1: 'élémentaire',
  2: 'intermédiaire',
  3: 'avancé',
};

// Calculer l'effort requis pour atteindre l'objectif
const calculateWorkload = (
  objective: PlanningObjective, 
  questionCounts: Record<string, number>
) => {
  const now = new Date();
  const deadline = new Date(objective.deadline);
  
  if (isPast(deadline)) {
    return { perDay: 0, perWeek: 0, totalQuestions: 0, daysRemaining: 0 };
  }
  
  const daysRemaining = Math.max(1, differenceInDays(deadline, now));
  const weeksRemaining = Math.max(1, differenceInWeeks(deadline, now));
  
  let totalQuestions = 0;
  
  if (objective.objective_type === 'certification') {
    const level = objective.target_certification_level || 1;
    const levelName = LEVEL_NAME_MAP[level] || 'élémentaire';
    totalQuestions = questionCounts[levelName] || 0;
  } else {
    // Pour la progression, calculer basé sur le pourcentage des questions totales
    const progressTarget = objective.target_progression_percentage || 100;
    const allQuestions = Object.values(questionCounts).reduce((sum, count) => sum + count, 0);
    totalQuestions = Math.round((progressTarget / 100) * allQuestions);
  }
  
  const questionsPerDay = totalQuestions > 0 ? Math.ceil(totalQuestions / daysRemaining) : 0;
  const questionsPerWeek = totalQuestions > 0 ? Math.ceil(totalQuestions / weeksRemaining) : 0;
  
  return {
    perDay: questionsPerDay,
    perWeek: questionsPerWeek,
    totalQuestions,
    daysRemaining
  };
};

interface SchoolClass {
  school: string;
  class_name: string | null;
  count: number;
}

interface Administrator {
  user_id: string;
  email: string;
}

export const PlanningManager = () => {
  const { toast } = useToast();
  const { objectives, loading, refetch } = usePlanningObjectives();
  const { difficultyLevels } = useDifficultyLevels();
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [uniqueSchools, setUniqueSchools] = useState<string[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<PlanningObjective | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    school: '',
    class_name: '',
    city: '',
    objective_type: 'certification' as 'certification' | 'progression',
    target_certification_level: 1,
    target_progression_percentage: 80,
    deadline: '',
    description: '',
    is_active: true,
    reference_admin_id: ''
  });

  // Charger les écoles et classes depuis la table users
  useEffect(() => {
    const fetchSchoolClasses = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('school, class_name');
      
      if (error) {
        console.error('Error fetching school classes:', error);
        return;
      }

      // Grouper par école et classe
      const groupedData: Record<string, Record<string, number>> = {};
      const schools = new Set<string>();
      const classes = new Set<string>();

      (data || []).forEach((user: any) => {
        if (user.school) {
          schools.add(user.school);
          if (!groupedData[user.school]) {
            groupedData[user.school] = {};
          }
          const className = user.class_name || 'Non assigné';
          if (user.class_name) classes.add(user.class_name);
          groupedData[user.school][className] = (groupedData[user.school][className] || 0) + 1;
        }
      });

      const result: SchoolClass[] = [];
      Object.entries(groupedData).forEach(([school, classData]) => {
        Object.entries(classData).forEach(([className, count]) => {
          result.push({
            school,
            class_name: className === 'Non assigné' ? null : className,
            count
          });
        });
      });

      setSchoolClasses(result);
      setUniqueSchools(Array.from(schools).sort());
      setUniqueClasses(Array.from(classes).sort());
    };

    fetchSchoolClasses();
  }, []);

  // Charger le nombre de questions par niveau
  useEffect(() => {
    const fetchQuestionCounts = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('level');
      
      if (error) {
        console.error('Error fetching question counts:', error);
        return;
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((q: any) => {
        if (q.level) {
          counts[q.level] = (counts[q.level] || 0) + 1;
        }
      });

      setQuestionCounts(counts);
    };

    fetchQuestionCounts();
  }, []);

  // Charger les administrateurs
  useEffect(() => {
    const fetchAdministrators = async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('user_id, email')
        .not('user_id', 'is', null);
      
      if (error) {
        console.error('Error fetching administrators:', error);
        return;
      }

      setAdministrators((data || []).filter((admin): admin is Administrator => admin.user_id !== null));
    };

    fetchAdministrators();
  }, []);

  const resetForm = () => {
    setFormData({
      school: '',
      class_name: '',
      city: '',
      objective_type: 'certification',
      target_certification_level: 1,
      target_progression_percentage: 80,
      deadline: '',
      description: '',
      is_active: true,
      reference_admin_id: ''
    });
    setEditingObjective(null);
  };

  const openEditDialog = (objective: PlanningObjective) => {
    setEditingObjective(objective);
    setFormData({
      school: objective.school,
      class_name: objective.class_name || '',
      city: objective.city || '',
      objective_type: objective.objective_type,
      target_certification_level: objective.target_certification_level || 1,
      target_progression_percentage: objective.target_progression_percentage || 80,
      deadline: objective.deadline ? objective.deadline.slice(0, 16) : '',
      description: objective.description || '',
      is_active: objective.is_active,
      reference_admin_id: objective.reference_admin_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validation: au moins une ville OU une école, et toujours une date limite
    if (!formData.deadline) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner une date limite",
        variant: "destructive"
      });
      return;
    }

    if (!formData.city && !formData.school) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une ville ou une école",
        variant: "destructive"
      });
      return;
    }

    const objectiveData = {
      school: formData.school || undefined,
      class_name: formData.class_name || undefined,
      city: formData.city || undefined,
      objective_type: formData.objective_type,
      target_certification_level: formData.objective_type === 'certification' ? formData.target_certification_level : undefined,
      target_progression_percentage: formData.objective_type === 'progression' ? formData.target_progression_percentage : undefined,
      deadline: new Date(formData.deadline).toISOString(),
      description: formData.description || undefined,
      is_active: true,
      reference_admin_id: formData.reference_admin_id || undefined
    };

    try {
      if (editingObjective) {
        const { error } = await supabase
          .from('planning_objectives')
          .update(objectiveData)
          .eq('id', editingObjective.id);
        
        if (error) throw error;
        toast({ title: "Objectif mis à jour avec succès" });
      } else {
        const { error } = await supabase
          .from('planning_objectives')
          .insert(objectiveData);
        
        if (error) throw error;
        toast({ title: "Objectif créé avec succès" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Error saving objective:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder l'objectif",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) return;

    try {
      const { error } = await supabase
        .from('planning_objectives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Objectif supprimé avec succès" });
      refetch();
    } catch (error: any) {
      console.error('Error deleting objective:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'objectif",
        variant: "destructive"
      });
    }
  };

  const getStudentCount = (school: string, className: string | null) => {
    if (className) {
      const match = schoolClasses.find(sc => sc.school === school && sc.class_name === className);
      return match?.count || 0;
    }
    // Si pas de classe, compter tous les étudiants de l'école
    return schoolClasses
      .filter(sc => sc.school === school)
      .reduce((sum, sc) => sum + sc.count, 0);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planification des objectifs
              </CardTitle>
              <CardDescription>
                Définissez des objectifs de certification ou de progression pour vos groupes d'étudiants
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel objectif
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingObjective ? "Modifier l'objectif" : "Créer un nouvel objectif"}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez un objectif pour un groupe d'étudiants
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Sélection ville */}
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville *</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => setFormData({ ...formData, city: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {city}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sélection école */}
                  <div className="space-y-2">
                    <Label htmlFor="school">École *</Label>
                    <Select
                      value={formData.school}
                      onValueChange={(value) => setFormData({ ...formData, school: value, class_name: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une école" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSchools.map((school) => (
                          <SelectItem key={school} value={school}>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4" />
                              {school}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sélection classe (optionnel) */}
                  <div className="space-y-2">
                    <Label htmlFor="class_name">Classe (optionnel)</Label>
                    <Select
                      value={formData.class_name}
                      onValueChange={(value) => setFormData({ ...formData, class_name: value === 'all' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Toutes les classes
                          </div>
                        </SelectItem>
                        {uniqueClasses.map((className) => (
                          <SelectItem key={className} value={className}>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              {className}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type d'objectif */}
                  <div className="space-y-2">
                    <Label>Type d'objectif *</Label>
                    <Select
                      value={formData.objective_type}
                      onValueChange={(value: 'certification' | 'progression') => 
                        setFormData({ ...formData, objective_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certification">Certification</SelectItem>
                        <SelectItem value="progression">Progression (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valeur cible selon le type */}
                  {formData.objective_type === 'certification' ? (
                    <div className="space-y-2">
                      <Label>Niveau de certification cible *</Label>
                      <Select
                        value={formData.target_certification_level.toString()}
                        onValueChange={(value) => 
                          setFormData({ ...formData, target_certification_level: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {difficultyLevels.map((level) => (
                            <SelectItem key={level.level_number} value={level.level_number.toString()}>
                              Niveau {level.level_number} - {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="target_progression">Progression cible (%) *</Label>
                      <Input
                        id="target_progression"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.target_progression_percentage}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          target_progression_percentage: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                  )}

                  {/* Deadline */}
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Date limite *</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  {/* Admin de référence */}
                  <div className="space-y-2">
                    <Label htmlFor="reference_admin">Admin de référence (optionnel)</Label>
                    <Select
                      value={formData.reference_admin_id}
                      onValueChange={(value) => setFormData({ ...formData, reference_admin_id: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un admin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Aucun admin assigné
                          </div>
                        </SelectItem>
                        {administrators.map((admin) => (
                          <SelectItem key={admin.user_id} value={admin.user_id}>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              {admin.email}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Description de l'objectif..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingObjective ? "Mettre à jour" : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Objectifs actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {objectives.filter(o => o.is_active && !isPast(new Date(o.deadline))).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Écoles concernées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueSchools.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Classes concernées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueClasses.length}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Liste des objectifs */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des objectifs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : objectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun objectif créé pour le moment
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>École / Classe / Ville</TableHead>
                  <TableHead>Objectif</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Effort estimé</TableHead>
                  <TableHead>Étudiants</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectives.map((objective) => {
                  const isExpired = isPast(new Date(objective.deadline));
                  const workload = calculateWorkload(objective, questionCounts);
                  return (
                    <TableRow key={objective.id}>
                      <TableCell>
                        <div className="font-medium">{objective.school}</div>
                        <div className="text-sm text-muted-foreground">
                          {objective.class_name || 'Toutes les classes'}
                        </div>
                        {objective.city && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {objective.city}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {objective.objective_type === 'certification' ? (
                          <Badge variant="default">
                            <Target className="h-3 w-3 mr-1" />
                            Certification Niv.{objective.target_certification_level}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {objective.target_progression_percentage}% progression
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(objective.deadline), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                        <div className={`text-sm ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {isExpired ? 'Expiré' : formatDistanceToNow(new Date(objective.deadline), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!isExpired && workload.perDay > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{workload.perDay} Q/jour</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ~{workload.perWeek} Q/semaine
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({workload.totalQuestions} Q total)
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {getStudentCount(objective.school, objective.class_name)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="destructive">Expiré</Badge>
                        ) : objective.is_active ? (
                          <Badge variant="default">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(objective)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(objective.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningManager;
