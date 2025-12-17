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
      // Récupérer des questions aléatoires de tous les niveaux
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .in('level', ['élémentaire', 'intermédiaire', 'avancé']);

      if (error) throw error;

      // Sécuriser les données
      const safeQuestions = Array.isArray(questions) ? questions : [];
      
      if (safeQuestions.length === 0) {
        return [];
      }

      // Classifier les questions par catégorie basée sur la règle
      const categorizedQuestions: AssessmentQuestion[] = safeQuestions
        .filter(q => q.content && q.answer) // Filtrer les questions valides (content et answer obligatoires)
        .map(q => ({
          id: q.id,
          content: q.content!,
          answer: q.answer!,
          choices: [], // Colonne choices non utilisée
          explanation: q.explanation || '',
          rule: q.rule || '',
          type: q.type || 'multiple_choice',
          created_at: q.created_at || new Date().toISOString(),
          level: q.level || 'élémentaire',
          category: categorizeQuestion(q.rule || '')
        }));

      // Grouper par niveau
      const questionsByLevel = {
        'élémentaire': categorizedQuestions.filter(q => q.level === 'élémentaire'),
        'intermédiaire': categorizedQuestions.filter(q => q.level === 'intermédiaire'),
        'avancé': categorizedQuestions.filter(q => q.level === 'avancé')
      };

      const selectedQuestions: AssessmentQuestion[] = [];

      // Sélectionner 10 questions aléatoires par niveau
      ['élémentaire', 'intermédiaire', 'avancé'].forEach(level => {
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