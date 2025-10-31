export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      administrators: {
        Row: {
          created_at: string | null
          email: string
          id: number
          is_super_admin: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string
          id?: never
          is_super_admin?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: never
          is_super_admin?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          uid: string
        }
        Insert: {
          created_at?: string
          uid: string
        }
        Update: {
          created_at?: string
          uid?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          badge_background_color: string | null
          badge_color: string | null
          badge_icon: string | null
          badge_size: string | null
          certificate_background_color: string | null
          certificate_border_color: string | null
          certificate_subtitle: string | null
          certificate_text: string
          certificate_text_color: string | null
          certificate_title: string
          created_at: string
          created_by: string | null
          custom_badge_url: string | null
          description: string | null
          difficulty_level_id: string
          feature_1_text: string | null
          feature_2_text: string | null
          feature_3_text: string | null
          free_sessions: number | null
          id: string
          is_active: boolean
          min_questions_correct: number | null
          min_score_required: number
          name: string
          price_euros: number | null
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          badge_background_color?: string | null
          badge_color?: string | null
          badge_icon?: string | null
          badge_size?: string | null
          certificate_background_color?: string | null
          certificate_border_color?: string | null
          certificate_subtitle?: string | null
          certificate_text: string
          certificate_text_color?: string | null
          certificate_title: string
          created_at?: string
          created_by?: string | null
          custom_badge_url?: string | null
          description?: string | null
          difficulty_level_id: string
          feature_1_text?: string | null
          feature_2_text?: string | null
          feature_3_text?: string | null
          free_sessions?: number | null
          id?: string
          is_active?: boolean
          min_questions_correct?: number | null
          min_score_required?: number
          name: string
          price_euros?: number | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          badge_background_color?: string | null
          badge_color?: string | null
          badge_icon?: string | null
          badge_size?: string | null
          certificate_background_color?: string | null
          certificate_border_color?: string | null
          certificate_subtitle?: string | null
          certificate_text?: string
          certificate_text_color?: string | null
          certificate_title?: string
          created_at?: string
          created_by?: string | null
          custom_badge_url?: string | null
          description?: string | null
          difficulty_level_id?: string
          feature_1_text?: string | null
          feature_2_text?: string | null
          feature_3_text?: string | null
          free_sessions?: number | null
          id?: string
          is_active?: boolean
          min_questions_correct?: number | null
          min_score_required?: number
          name?: string
          price_euros?: number | null
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_difficulty_level_id_fkey"
            columns: ["difficulty_level_id"]
            isOneToOne: true
            referencedRelation: "difficulty_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      difficulty_levels: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          level_number: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level_number: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level_number?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_resend_log: {
        Row: {
          created_at: string
          email: string
          id: number
          ip: unknown
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          ip: unknown
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          ip?: unknown
        }
        Relationships: []
      }
      failed_questions: {
        Row: {
          created_at: string
          failed_at: string
          id: string
          is_remediated: boolean | null
          level: number
          question_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_at?: string
          id?: string
          is_remediated?: boolean | null
          level: number
          question_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          failed_at?: string
          id?: string
          is_remediated?: boolean | null
          level?: number
          question_id?: number
          user_id?: string
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_legal: boolean
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_legal?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_legal?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          cookie_management_url: string | null
          copyright_text: string
          created_at: string
          id: string
          legal_link_enabled: boolean
          legal_link_label: string
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          cookie_management_url?: string | null
          copyright_text?: string
          created_at?: string
          id?: string
          legal_link_enabled?: boolean
          legal_link_label?: string
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          cookie_management_url?: string | null
          copyright_text?: string
          created_at?: string
          id?: string
          legal_link_enabled?: boolean
          legal_link_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      footer_social_links: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      initial_assessments: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          recommendations: string[] | null
          scores: Json
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          recommendations?: string[] | null
          scores?: Json
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          recommendations?: string[] | null
          scores?: Json
          user_id?: string
        }
        Relationships: []
      }
      legal_page: {
        Row: {
          content: string | null
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          full_name: string | null
          id: string
          is_founder: boolean | null
          role: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          full_name?: string | null
          id: string
          is_founder?: boolean | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          full_name?: string | null
          id?: string
          is_founder?: boolean | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_percentage: number
          expires_at: string | null
          id: string
          is_used: boolean
          level: number
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          level: number
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          level?: number
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempts_count: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          last_attempt_at: string | null
          level: number
          question_id: number
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          last_attempt_at?: string | null
          level: number
          question_id: number
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          last_attempt_at?: string | null
          level?: number
          question_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string | null
          choices: string[] | null
          content: string | null
          created_at: string | null
          explanation: string | null
          id: number
          level: string | null
          rule: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          choices?: string[] | null
          content?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: number
          level?: string | null
          rule?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          choices?: string[] | null
          content?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: number
          level?: string | null
          rule?: string | null
          type?: string | null
        }
        Relationships: []
      }
      resend_email_log: {
        Row: {
          created_at: string
          email: string
          id: number
          uid: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          uid?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          uid?: string | null
        }
        Relationships: []
      }
      resend_log: {
        Row: {
          email: string
          id: string
          sent_at: string | null
        }
        Insert: {
          email: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      session_progress: {
        Row: {
          completed_sessions: number | null
          created_at: string
          current_session_number: number | null
          id: string
          is_level_completed: boolean | null
          level: number
          total_sessions_for_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_sessions?: number | null
          created_at?: string
          current_session_number?: number | null
          id?: string
          is_level_completed?: boolean | null
          level: number
          total_sessions_for_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_sessions?: number | null
          created_at?: string
          current_session_number?: number | null
          id?: string
          is_level_completed?: boolean | null
          level?: number
          total_sessions_for_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_configuration: {
        Row: {
          config_key: string
          config_value: Json | null
          id: number
          last_updated: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json | null
          id?: never
          last_updated?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json | null
          id?: never
          last_updated?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: number | null
          session_id: string | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          created_at: string
          id?: string
          is_correct?: boolean | null
          question_id?: number | null
          session_id?: string | null
          user_answer?: string | null
          user_id?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: number | null
          session_id?: string | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_batches: {
        Row: {
          batch_number: number
          completed_at: string | null
          created_at: string | null
          id: string
          level: number
          questions_count: number | null
          user_id: string
        }
        Insert: {
          batch_number: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level: number
          questions_count?: number | null
          user_id: string
        }
        Update: {
          batch_number?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level?: number
          questions_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          certification_target: boolean | null
          created_at: string | null
          current_batch: number | null
          current_level: number | null
          deleted_at: string | null
          ended_at: string | null
          id: string
          is_session_validated: boolean | null
          level: number | null
          questions_mastered: number | null
          required_score_percentage: number | null
          score: number | null
          session_number: number | null
          session_type: string | null
          started_at: string | null
          status: string | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          certification_target?: boolean | null
          created_at?: string | null
          current_batch?: number | null
          current_level?: number | null
          deleted_at?: string | null
          ended_at?: string | null
          id?: string
          is_session_validated?: boolean | null
          level?: number | null
          questions_mastered?: number | null
          required_score_percentage?: number | null
          score?: number | null
          session_number?: number | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          certification_target?: boolean | null
          created_at?: string | null
          current_batch?: number | null
          current_level?: number | null
          deleted_at?: string | null
          ended_at?: string | null
          id?: string
          is_session_validated?: boolean | null
          level?: number | null
          questions_mastered?: number | null
          required_score_percentage?: number | null
          score?: number | null
          session_number?: number | null
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_certifications: {
        Row: {
          certified_at: string | null
          created_at: string | null
          credential_id: string
          expiration_date: string | null
          id: string
          issuing_organization: string | null
          json_ld_badge: Json | null
          level: number
          score: number
          user_id: string
        }
        Insert: {
          certified_at?: string | null
          created_at?: string | null
          credential_id?: string
          expiration_date?: string | null
          id?: string
          issuing_organization?: string | null
          json_ld_badge?: Json | null
          level: number
          score: number
          user_id: string
        }
        Update: {
          certified_at?: string | null
          created_at?: string | null
          credential_id?: string
          expiration_date?: string | null
          id?: string
          issuing_organization?: string | null
          json_ld_badge?: Json | null
          level?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_level_purchases: {
        Row: {
          access_code_used: boolean | null
          created_at: string
          id: string
          level: number
          payment_method: string | null
          price_paid: number
          purchased_at: string
          status: string
          stripe_payment_intent_id: string | null
          temporary_access_code: string | null
          user_id: string
        }
        Insert: {
          access_code_used?: boolean | null
          created_at?: string
          id?: string
          level: number
          payment_method?: string | null
          price_paid: number
          purchased_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          temporary_access_code?: string | null
          user_id: string
        }
        Update: {
          access_code_used?: boolean | null
          created_at?: string
          id?: string
          level?: number
          payment_method?: string | null
          price_paid?: number
          purchased_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          temporary_access_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          class_name: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          school: string | null
          user_id: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          school?: string | null
          user_id?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          school?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_promo_code: {
        Args: {
          certification_level: number
          code_text: string
          user_uuid: string
        }
        Returns: Json
      }
      calculate_total_sessions_for_level: {
        Args: { level_num: number; questions_percentage?: number }
        Returns: number
      }
      can_resend:
        | { Args: { p_email: string }; Returns: boolean }
        | {
            Args: { _email: string; _ip: unknown; _window_seconds?: number }
            Returns: boolean
          }
      generate_credential_id: { Args: never; Returns: string }
      generate_temporary_access_code: { Args: never; Returns: string }
      get_free_sessions_for_level: {
        Args: { level_num: number }
        Returns: number
      }
      get_session_questions: {
        Args: {
          level_num: number
          questions_percentage?: number
          session_num: number
          user_uuid: string
        }
        Returns: {
          answer: string
          choices: string[]
          content: string
          explanation: string
          id: number
          level: string
          rule: string
          type: string
        }[]
      }
      get_user_max_level: { Args: { user_uuid?: string }; Returns: number }
      get_users_count: { Args: never; Returns: number }
      is_super_admin:
        | { Args: { uid: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      user_has_purchased_level: {
        Args: { level_num: number; user_uuid: string }
        Returns: boolean
      }
      validate_promo_code: {
        Args: { certification_level: number; code_text: string }
        Returns: Json
      }
      write_resend_log:
        | { Args: { p_email: string }; Returns: undefined }
        | { Args: { _email: string; _ip: unknown }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
