import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { InitialAssessment, AssessmentQuestion } from '@/types/interfaces';

export const useInitialAssessment = () => {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<InitialAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);

  const loadAssessment = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('initial_assessments')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const assessmentData: InitialAssessment = {
          ...data,
          scores: data.scores as { conjugaison: number; grammaire: number; vocabulaire: number; overall: number },
          recommendations: data.recommendations || []
        };
        setAssessment(assessmentData);
        setHasCompleted(true);
      } else {
        setHasCompleted(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évaluation:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAssessmentQuestions = useCallback(async (): Promise<AssessmentQuestion[]> => {
    try {
      // Récupérer des questions aléatoires de tous les niveaux (1-4)
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .in('level', [1, 2, 3, 4]);

      if (error) throw error;

      if (!questions || questions.length === 0) {
        return [];
      }

      // Classifier les questions par catégorie basée sur la règle
      const categorizedQuestions: AssessmentQuestion[] = questions
        .filter(q => q.content && q.answer) // Filtrer les questions valides (content et answer obligatoires)
        .map(q => ({
          ...q,
          content: q.content!,
          answer: q.answer!,
          choices: [], // Colonne choices non utilisée
          explanation: q.explanation || '',
          rule: q.rule || '',
          type: q.type || 'multiple_choice',
          created_at: q.created_at || new Date().toISOString(),
          level: q.level || 1,
          category: categorizeQuestion(q.rule || '')
        }));

      // Grouper par niveau
      const questionsByLevel = {
        1: categorizedQuestions.filter(q => q.level === 1),
        2: categorizedQuestions.filter(q => q.level === 2),
        3: categorizedQuestions.filter(q => q.level === 3),
        4: categorizedQuestions.filter(q => q.level === 4)
      };

      const selectedQuestions: AssessmentQuestion[] = [];

      // Sélectionner 10 questions aléatoires par niveau
      [1, 2, 3, 4].forEach(level => {
        const levelQuestions = questionsByLevel[level as keyof typeof questionsByLevel];
        if (levelQuestions.length > 0) {
          // Mélanger les questions du niveau
          const shuffled = levelQuestions.sort(() => Math.random() - 0.5);
          // Prendre 10 questions (ou moins si pas assez disponibles)
          const selected = shuffled.slice(0, Math.min(10, shuffled.length));
          selectedQuestions.push(...selected);
        }
      });

      // Mélanger toutes les questions sélectionnées pour l'ordre de présentation
      return selectedQuestions.sort(() => Math.random() - 0.5);
    } catch (error) {
      console.error('Erreur lors du chargement des questions d\'évaluation:', error);
      return [];
    }
  }, []);

  const categorizeQuestion = (rule: string): 'conjugaison' | 'grammaire' | 'vocabulaire' => {
    const ruleLower = rule.toLowerCase();
    
    if (ruleLower.includes('conjugaison') || 
        ruleLower.includes('présent') || 
        ruleLower.includes('impératif') || 
        ruleLower.includes('verbe') ||
        ruleLower.includes('transmettre') ||
        ruleLower.includes('terminaison')) {
      return 'conjugaison';
    }
    
    if (ruleLower.includes('vocabulaire') || 
        ruleLower.includes('lexical') || 
        ruleLower.includes('choix') ||
        ruleLower.includes('locution') ||
        ruleLower.includes('latin')) {
      return 'vocabulaire';
    }
    
    // Par défaut, considérer comme grammaire
    return 'grammaire';
  };

  const saveAssessment = useCallback(async (
    scores: { conjugaison: number; grammaire: number; vocabulaire: number; overall: number },
    recommendations: string[]
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('initial_assessments')
        .upsert({
          user_id: user.id,
          scores,
          recommendations,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const assessmentData: InitialAssessment = {
        ...data,
        scores: data.scores as { conjugaison: number; grammaire: number; vocabulaire: number; overall: number },
        recommendations: data.recommendations || []
      };
      setAssessment(assessmentData);
      setHasCompleted(true);
      return assessmentData;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'évaluation:', error);
      throw error;
    }
  }, [user]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  return {
    assessment,
    loading,
    hasCompleted,
    getAssessmentQuestions,
    saveAssessment,
    refetch: loadAssessment
  };
};