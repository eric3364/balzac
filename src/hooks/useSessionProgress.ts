import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SessionProgress {
  level: number;
  currentSessionNumber: number;
  totalSessionsForLevel: number;
  completedSessions: number;
  isLevelCompleted: boolean;
  failedQuestionsCount: number;
}

interface SessionInfo {
  sessionNumber: number;
  sessionType: 'regular' | 'remedial';
  questionsCount: number;
  isAvailable: boolean;
}

export const useSessionProgress = (level: number) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableSessions, setAvailableSessions] = useState<SessionInfo[]>([]);

  const loadProgress = useCallback(async (forceRefresh = false) => {
    if (!user || !level) return;

    try {
      setLoading(true);

      // D'abord récupérer le pourcentage de questions configuré
      const { data: configData } = await supabase
        .from('site_configuration')
        .select('config_value')
        .eq('config_key', 'questions_percentage_per_level')
        .single();

      const questionsPercentage = parseInt(configData?.config_value as string) || 20;

      // Calculer le nombre total de sessions pour ce niveau
      // Si 20% par session : 100/20 = 5 sessions
      // Si 25% par session : 100/25 = 4 sessions  
      // Si 10% par session : 100/10 = 10 sessions
      const correctTotalSessions = Math.ceil(100 / questionsPercentage);

      // Récupérer ou créer la progression pour ce niveau
      const { data: existingProgress } = await supabase
        .from('session_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', level)
        .single();

      let progressData = existingProgress;

      if (!existingProgress) {
        // Créer une nouvelle progression avec le bon nombre de sessions
        const { data: newProgress, error } = await supabase
          .from('session_progress')
          .insert({
            user_id: user.id,
            level: level,
            current_session_number: parseFloat(`${level}.1`),
            total_sessions_for_level: correctTotalSessions,
            completed_sessions: 0,
            is_level_completed: false
          })
          .select()
          .single();

        if (error) throw error;
        progressData = newProgress;
      } else {
        // Mettre à jour le nombre total de sessions si nécessaire
        if (existingProgress.total_sessions_for_level !== correctTotalSessions) {
          const { data: updatedProgress, error } = await supabase
            .from('session_progress')
            .update({ 
              total_sessions_for_level: correctTotalSessions,
              // Réajuster la progression si nécessaire
              completed_sessions: Math.min(existingProgress.completed_sessions, correctTotalSessions),
              current_session_number: existingProgress.current_session_number > parseFloat(`${level}.${correctTotalSessions}`) 
                ? parseFloat(`${level}.${correctTotalSessions}`)
                : existingProgress.current_session_number
            })
            .eq('user_id', user.id)
            .eq('level', level)
            .select()
            .single();

          if (error) throw error;
          progressData = updatedProgress;
        }
      }

      // Récupérer le nombre de questions échouées pour ce niveau
      const { data: failedQuestions } = await supabase
        .from('failed_questions')
        .select('id')
        .eq('user_id', user.id)
        .eq('level', level)
        .eq('is_remediated', false);

      setProgress({
        level: progressData.level,
        currentSessionNumber: progressData.current_session_number,
        totalSessionsForLevel: progressData.total_sessions_for_level,
        completedSessions: progressData.completed_sessions,
        isLevelCompleted: progressData.is_level_completed,
        failedQuestionsCount: failedQuestions?.length || 0
      });

      // Générer la liste des sessions disponibles avec prérequis
      const sessions: SessionInfo[] = [];
      
      // Sessions régulières
      for (let i = 1; i <= progressData.total_sessions_for_level; i++) {
        const sessionNumber = parseFloat(`${level}.${i}`);
        const isFirstSession = i === 1;
        const previousSessionNumber = parseFloat(`${level}.${i - 1}`);
        
        // Une session est disponible si :
        // - C'est la première session du niveau OU
        // - La session précédente a été complétée avec succès
        const isAvailable = isFirstSession || sessionNumber <= progressData.current_session_number;
        const isCompleted = sessionNumber < progressData.current_session_number || 
                           (sessionNumber === progressData.current_session_number && progressData.completed_sessions >= i);
        
        sessions.push({
          sessionNumber,
          sessionType: 'regular',
          questionsCount: 0, // À calculer
          isAvailable
        });
      }

      // Session de rattrapage si des questions ont échoué
      if (failedQuestions && failedQuestions.length > 0 && progressData.completed_sessions === progressData.total_sessions_for_level) {
        sessions.push({
          sessionNumber: parseFloat(`${level}.99`), // Session de rattrapage
          sessionType: 'remedial',
          questionsCount: failedQuestions.length,
          isAvailable: true
        });
      }

      setAvailableSessions(sessions);

    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error);
    } finally {
      setLoading(false);
    }
  }, [user, level]);

  const updateProgress = useCallback(async (sessionNumber: number, isCompleted: boolean) => {
    if (!user || !progress) return;

    try {
      const updates: any = {};

      if (isCompleted) {
        // Vérifier si c'est la session de rattrapage
        if (sessionNumber >= 99) {
          // Session de rattrapage complétée - valider le niveau
          updates.is_level_completed = true;
          
          // Marquer toutes les questions échouées comme remédiées
          await supabase
            .from('failed_questions')
            .update({ is_remediated: true })
            .eq('user_id', user.id)
            .eq('level', level);
        } else {
          // Session régulière complétée
          const nextSessionIndex = Math.floor((sessionNumber - level) * 10) + 1;
          
          if (nextSessionIndex < progress.totalSessionsForLevel) {
            // Passer à la session suivante
            updates.current_session_number = parseFloat(`${level}.${nextSessionIndex + 1}`);
            updates.completed_sessions = progress.completedSessions + 1;
          } else {
            // Toutes les sessions régulières complétées
            updates.completed_sessions = progress.totalSessionsForLevel;
            
            // Vérifier s'il y a des questions échouées
            const { data: failedQuestions } = await supabase
              .from('failed_questions')
              .select('id')
              .eq('user_id', user.id)
              .eq('level', level)
              .eq('is_remediated', false);

            if (!failedQuestions || failedQuestions.length === 0) {
              // Aucune question échouée - valider le niveau
              updates.is_level_completed = true;
            }
          }
        }

        // Mettre à jour la progression
        await supabase
          .from('session_progress')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('level', level);

        // Recharger la progression
        await loadProgress();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
    }
  }, [user, level, progress, loadProgress]);

  const recordFailedQuestion = useCallback(async (questionId: number) => {
    if (!user) return;

    try {
      await supabase
        .from('failed_questions')
        .upsert({
          user_id: user.id,
          question_id: questionId,
          level: level,
          is_remediated: false
        }, {
          onConflict: 'user_id,question_id,level'
        });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la question échouée:', error);
    }
  }, [user, level]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return {
    progress,
    loading,
    availableSessions,
    updateProgress,
    recordFailedQuestion,
    refetch: loadProgress
  };
};