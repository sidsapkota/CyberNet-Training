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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_completions: {
        Row: {
          card_id: string
          completed_at: string
          lesson_id: string
          user_id: string
          xp: number
        }
        Insert: {
          card_id: string
          completed_at: string
          lesson_id: string
          user_id: string
          xp: number
        }
        Update: {
          card_id?: string
          completed_at?: string
          lesson_id?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      card_mistakes: {
        Row: {
          card_id: string
          cleared_at: string | null
          first_missed_at: string
          last_missed_at: string
          lesson_id: string
          misses: number
          user_id: string
        }
        Insert: {
          card_id: string
          cleared_at?: string | null
          first_missed_at?: string
          last_missed_at?: string
          lesson_id: string
          misses?: number
          user_id: string
        }
        Update: {
          card_id?: string
          cleared_at?: string | null
          first_missed_at?: string
          last_missed_at?: string
          lesson_id?: string
          misses?: number
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          completed_on: string
          course_id: string
          id: string
          issued_at: string
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          completed_on: string
          course_id: string
          id: string
          issued_at?: string
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          completed_on?: string
          course_id?: string
          id?: string
          issued_at?: string
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          message: string
          rating: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          message: string
          rating?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          message?: string
          rating?: number | null
          session_id?: string
        }
        Relationships: []
      }
      goal_days: {
        Row: {
          day: string
          goal: number
          met_at: string
          time_zone: string
          user_id: string
        }
        Insert: {
          day: string
          goal: number
          met_at?: string
          time_zone: string
          user_id: string
        }
        Update: {
          day?: string
          goal?: number
          met_at?: string
          time_zone?: string
          user_id?: string
        }
        Relationships: []
      }
      handle_reports: {
        Row: {
          created_at: string
          handle: string
          id: number
          reason: string
          reported_user_id: string
          reporter_id: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          handle: string
          id?: never
          reason: string
          reported_user_id: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: never
          reason?: string
          reported_user_id?: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      league_members: {
        Row: {
          joined_at: string
          league_id: string
          user_id: string
          week: string
        }
        Insert: {
          joined_at?: string
          league_id: string
          user_id: string
          week: string
        }
        Update: {
          joined_at?: string
          league_id?: string
          user_id?: string
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_players: {
        Row: {
          created_at: string
          handle: string
          handle_changed_at: string | null
          handle_key: string
          pro_cosmetic_until: string | null
          show_on_leaderboards: boolean
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          handle_changed_at?: string | null
          handle_key: string
          pro_cosmetic_until?: string | null
          show_on_leaderboards?: boolean
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          handle_changed_at?: string | null
          handle_key?: string
          pro_cosmetic_until?: string | null
          show_on_leaderboards?: boolean
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      league_results: {
        Row: {
          from_tier: string
          league_id: string
          rank: number
          seen_at: string | null
          to_tier: string
          user_id: string
          week: string
          weekly_xp: number
        }
        Insert: {
          from_tier: string
          league_id: string
          rank: number
          seen_at?: string | null
          to_tier: string
          user_id: string
          week: string
          weekly_xp: number
        }
        Update: {
          from_tier?: string
          league_id?: string
          rank?: number
          seen_at?: string | null
          to_tier?: string
          user_id?: string
          week?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_results_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_state: {
        Row: {
          id: boolean
          opened_at: string | null
        }
        Insert: {
          id?: boolean
          opened_at?: string | null
        }
        Update: {
          id?: boolean
          opened_at?: string | null
        }
        Relationships: []
      }
      league_weeks: {
        Row: {
          finalized_at: string
          week: string
        }
        Insert: {
          finalized_at?: string
          week: string
        }
        Update: {
          finalized_at?: string
          week?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          band: string
          created_at: string
          id: string
          tier: string
          week: string
        }
        Insert: {
          band: string
          created_at?: string
          id?: string
          tier: string
          week: string
        }
        Update: {
          band?: string
          created_at?: string
          id?: string
          tier?: string
          week?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
          xp: number
        }
        Insert: {
          completed_at: string
          lesson_id: string
          user_id: string
          xp: number
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      lesson_opens: {
        Row: {
          day: string
          lesson_id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          day: string
          lesson_id: string
          opened_at?: string
          user_id: string
        }
        Update: {
          day?: string
          lesson_id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_grants: {
        Row: {
          expires_at: string
          reason: string
          starts_at: string
          thanked_at: string | null
          user_id: string
        }
        Insert: {
          expires_at: string
          reason: string
          starts_at?: string
          thanked_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string
          reason?: string
          starts_at?: string
          thanked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed: boolean
          coach_seen: string[]
          created_at: string
          daily_goal: number
          daily_goal_chosen: boolean
          display_name: string | null
          id: string
          learning_mode: string
          sound_enabled: boolean
          time_zone: string | null
          time_zone_changed_at: string | null
        }
        Insert: {
          age_confirmed?: boolean
          coach_seen?: string[]
          created_at?: string
          daily_goal?: number
          daily_goal_chosen?: boolean
          display_name?: string | null
          id: string
          learning_mode?: string
          sound_enabled?: boolean
          time_zone?: string | null
          time_zone_changed_at?: string | null
        }
        Update: {
          age_confirmed?: boolean
          coach_seen?: string[]
          created_at?: string
          daily_goal?: number
          daily_goal_chosen?: boolean
          display_name?: string | null
          id?: string
          learning_mode?: string
          sound_enabled?: boolean
          time_zone?: string | null
          time_zone_changed_at?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
          xp: number
        }
        Insert: {
          answers?: Json
          attempted_at: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
          xp: number
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          current_period_end: string | null
          customer_id: string
          ended_at: string | null
          id: string
          price_id: string
          started_at: string
          status: string
          synced_at: string
          trial_end: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          customer_id: string
          ended_at?: string | null
          id: string
          price_id: string
          started_at: string
          status: string
          synced_at?: string
          trial_end?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          customer_id?: string
          ended_at?: string | null
          id?: string
          price_id?: string
          started_at?: string
          status?: string
          synced_at?: string
          trial_end?: string | null
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          at: string
          card_id: string | null
          day: string
          id: number
          kind: string
          lesson_id: string
          time_zone: string
          user_id: string
          xp: number
        }
        Insert: {
          at?: string
          card_id?: string | null
          day: string
          id?: never
          kind: string
          lesson_id: string
          time_zone: string
          user_id: string
          xp: number
        }
        Update: {
          at?: string
          card_id?: string | null
          day?: string
          id?: never
          kind?: string
          lesson_id?: string
          time_zone?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finalize_league_week: {
        Args: { p_results: Json; p_week: string }
        Returns: undefined
      }
      join_league: {
        Args: {
          p_bands: string[]
          p_cap?: number
          p_tier: string
          p_user: string
          p_week: string
        }
        Returns: string
      }
      league_standings: {
        Args: never
        Returns: {
          handle: string
          is_me: boolean
          pro: boolean
          rank: number
          tier: string
          weekly_xp: number
        }[]
      }
      league_week: { Args: { t?: string }; Returns: string }
      leagues_open: { Args: never; Returns: boolean }
      open_lesson: {
        Args: {
          p_lesson: string
          p_limit: number
          p_time_zone?: string
          p_user: string
        }
        Returns: {
          allowed: boolean
          day: string
          used: number
        }[]
      }
      record_mistake: {
        Args: { p_card: string; p_lesson: string; p_user: string }
        Returns: undefined
      }
      verify_certificate: {
        Args: { p_id: string }
        Returns: {
          completed_on: string
          course_id: string
          name: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
