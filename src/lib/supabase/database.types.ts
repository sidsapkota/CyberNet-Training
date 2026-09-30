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
          is_premium: boolean
          learning_mode: string
          sound_enabled: boolean
          time_zone: string | null
        }
        Insert: {
          age_confirmed?: boolean
          coach_seen?: string[]
          created_at?: string
          daily_goal?: number
          daily_goal_chosen?: boolean
          display_name?: string | null
          id: string
          is_premium?: boolean
          learning_mode?: string
          sound_enabled?: boolean
          time_zone?: string | null
        }
        Update: {
          age_confirmed?: boolean
          coach_seen?: string[]
          created_at?: string
          daily_goal?: number
          daily_goal_chosen?: boolean
          display_name?: string | null
          id?: string
          is_premium?: boolean
          learning_mode?: string
          sound_enabled?: boolean
          time_zone?: string | null
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
      [_ in never]: never
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
