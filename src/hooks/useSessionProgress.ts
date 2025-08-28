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
      console.log('Questions percentage récupéré:', questionsPercentage);

      // Calculer le nombre total de sessions pour ce niveau
      // Si 20% par session : 100/20 = 5 sessions
      // Si 25% par session : 100/25 = 4 sessions  
      // Si 10% par session : 100/10 = 10 sessions
      const correctTotalSessions = Math.ceil(100 / questionsPercentage);
      console.log('Nombre de sessions calculé:', correctTotalSessions);

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
            current_session_number: 1, // Commencer à 1
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
              completed_sessions: Math.min(existingProgress.completed_sessions || 0, correctTotalSessions),
              current_session_number: Math.min(Number(existingProgress.current_session_number) || 1, correctTotalSessions)
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

      if (progressData) {
        setProgress({
          level: progressData.level,
          currentSessionNumber: Number(progressData.current_session_number) || 1,
          totalSessionsForLevel: progressData.total_sessions_for_level || 5,
          completedSessions: progressData.completed_sessions || 0,
          isLevelCompleted: progressData.is_level_completed || false,
          failedQuestionsCount: failedQuestions?.length || 0
        });
      }

      if (progressData) {
        console.log('Progress data:', progressData);
        console.log('Total sessions for level:', progressData.total_sessions_for_level);

        // Générer la liste des sessions disponibles avec numérotation simplifiée
        const sessions: SessionInfo[] = [];
        const totalSessions = progressData.total_sessions_for_level || 5;
        const currentSession = Number(progressData.current_session_number) || 1;
        
        // Sessions régulières numérotées de 1 à totalSessionsForLevel
        for (let i = 1; i <= totalSessions; i++) {
          const sessionNumber = i;
          const isFirstSession = i === 1;
          const completedSessions = progressData.completed_sessions || 0;
          
          // Une session est disponible si :
          // - C'est la première session du niveau OU
          // - Elle fait partie des sessions complétées OU
          // - C'est la session suivante après les sessions complétées
          const isAvailable = isFirstSession || i <= completedSessions + 1;
          
          sessions.push({
            sessionNumber,
            sessionType: 'regular',
            questionsCount: 0, // À calculer
            isAvailable
          });
        }

        // Session de rattrapage si des questions ont échoué
        if (failedQuestions && failedQuestions.length > 0 && (progressData.completed_sessions || 0) === totalSessions) {
          sessions.push({
            sessionNumber: 99, // Session de rattrapage
            sessionType: 'remedial',
            questionsCount: failedQuestions.length,
            isAvailable: true
          });
        }

        setAvailableSessions(sessions);
      }

    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error);
    } finally {
      setLoading(false);
    }
  }, [user, level]);

  const createCertification = useCallback(async (levelNumber: number, finalScore: number) => {
    if (!user) return null;

    try {
      // Créer la certification
      const { data: certification, error } = await supabase
        .from('user_certifications')
        .insert({
          user_id: user.id,
          level: levelNumber,
          score: finalScore,
          certified_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la certification:', error);
        return null;
      }

      console.log('🏆 Certification créée avec succès:', certification);
      return certification;
    } catch (error) {
      console.error('Erreur lors de la création de la certification:', error);
      return null;
    }
  }, [user]);

  const updateProgress = useCallback(async (sessionNumber: number, isCompleted: boolean, sessionScore?: number) => {
    if (!user || !progress) return { levelCompleted: false, certification: null };

    try {
      const updates: any = {};
      let levelCompleted = false;
      let certification = null;

      if (isCompleted) {
        // Vérifier si c'est la session de rattrapage
        if (sessionNumber >= 99) {
          // Session de rattrapage complétée - valider le niveau
          updates.is_level_completed = true;
          levelCompleted = true;
          
          // Marquer toutes les questions échouées comme remédiées
          await supabase
            .from('failed_questions')
            .update({ is_remediated: true })
            .eq('user_id', user.id)
            .eq('level', level);

          // Créer la certification avec le score de la session de rattrapage
          if (sessionScore) {
            certification = await createCertification(level, sessionScore);
          }
        } else {
          // Session régulière complétée avec numérotation simplifiée
          updates.completed_sessions = sessionNumber;
          
          if (sessionNumber < progress.totalSessionsForLevel) {
            // Passer à la session suivante
            updates.current_session_number = sessionNumber + 1;
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
              levelCompleted = true;

              // Créer la certification avec le score de la dernière session
              if (sessionScore) {
                certification = await createCertification(level, sessionScore);
              }
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

      return { levelCompleted, certification };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
      return { levelCompleted: false, certification: null };
    }
  }, [user, level, progress, loadProgress, createCertification]);

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