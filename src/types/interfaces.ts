// Common interfaces to handle nullable database fields
export interface Question {
  id: number;
  content: string;
  type: string;
  level: string;
  rule: string;
  answer: string;
  explanation: string;
  created_at: string;
  choices: string[];
}

export interface UserCertification {
  id: string;
  user_id: string;
  level: number;
  score: number;
  certified_at: string;
  credential_id: string;
  issuing_organization: string;
  expiration_date: string | null;
  json_ld_badge: any;
  created_at: string;
}

export interface TestSession {
  id: string;
  user_id: string;
  level: number;
  status: string;
  score: number | null;
  total_questions: number;
  questions_mastered: number;
  certification_target: boolean;
  session_type: string;
  session_number: number;
  required_score_percentage: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  current_level: number;
  current_batch: number;
  is_session_validated: boolean;
  deleted_at: string | null;
}

export interface TestBatch {
  id: string;
  user_id: string;
  level: number;
  batch_number: number;
  questions_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface UpdateProgressResult {
  levelCompleted: boolean;
  certification: UserCertification | null;
}

export interface InitialAssessment {
  id: string;
  user_id: string;
  completed_at: string;
  scores: {
    conjugaison: number;
    grammaire: number;
    vocabulaire: number;
    overall: number;
  };
  recommendations: string[];
  created_at: string;
}

export interface AssessmentQuestion extends Question {
  category: 'conjugaison' | 'grammaire' | 'vocabulaire';
}