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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      body_transformations: {
        Row: {
          after_date: string | null
          after_photo_url: string | null
          after_weight: number | null
          before_date: string | null
          before_photo_url: string | null
          before_weight: number | null
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          after_date?: string | null
          after_photo_url?: string | null
          after_weight?: number | null
          before_date?: string | null
          before_photo_url?: string | null
          before_weight?: number | null
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          after_date?: string | null
          after_photo_url?: string | null
          after_weight?: number | null
          before_date?: string | null
          before_photo_url?: string | null
          before_weight?: number | null
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      change_readings: {
        Row: {
          id: string
          last_read_at: string
          student_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          student_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          student_id?: string
        }
        Relationships: []
      }
      custom_surveys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          trainer_id?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          actual_reps: number | null
          actual_sets: number | null
          actual_weight: number | null
          completed: boolean | null
          created_at: string
          exercise_id: string
          id: string
          log_date: string
          notes: string | null
          student_id: string
          trainer_id: string
        }
        Insert: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight?: number | null
          completed?: boolean | null
          created_at?: string
          exercise_id: string
          id?: string
          log_date?: string
          notes?: string | null
          student_id: string
          trainer_id: string
        }
        Update: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight?: number | null
          completed?: boolean | null
          created_at?: string
          exercise_id?: string
          id?: string
          log_date?: string
          notes?: string | null
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string | null
          completed: boolean
          created_at: string
          day: string
          exercise_type: string
          id: string
          is_dropset: boolean | null
          is_piramide: boolean | null
          is_to_failure: boolean | null
          name: string
          parent_exercise_id: string | null
          pyramid_reps: string | null
          reps: number
          routine_id: string | null
          sets: number
          student_id: string
          trainer_id: string
          weight: number
        }
        Insert: {
          body_part?: string | null
          completed?: boolean
          created_at?: string
          day?: string
          exercise_type?: string
          id?: string
          is_dropset?: boolean | null
          is_piramide?: boolean | null
          is_to_failure?: boolean | null
          name: string
          parent_exercise_id?: string | null
          pyramid_reps?: string | null
          reps?: number
          routine_id?: string | null
          sets?: number
          student_id: string
          trainer_id: string
          weight?: number
        }
        Update: {
          body_part?: string | null
          completed?: boolean
          created_at?: string
          day?: string
          exercise_type?: string
          id?: string
          is_dropset?: boolean | null
          is_piramide?: boolean | null
          is_to_failure?: boolean | null
          name?: string
          parent_exercise_id?: string | null
          pyramid_reps?: string | null
          reps?: number
          routine_id?: string | null
          sets?: number
          student_id?: string
          trainer_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_parent_exercise_id_fkey"
            columns: ["parent_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      global_plans: {
        Row: {
          active: boolean
          content: string | null
          created_at: string
          id: string
          level: string
          plan_type: string
          price: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          level: string
          plan_type: string
          price?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          level?: string
          plan_type?: string
          price?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_exercises: {
        Row: {
          body_part: string | null
          created_at: string
          day: string
          exercise_type: string
          group_id: string
          id: string
          is_dropset: boolean | null
          is_piramide: boolean | null
          is_to_failure: boolean | null
          name: string
          pyramid_reps: string | null
          reps: number
          sets: number
          trainer_id: string
          weight: number
        }
        Insert: {
          body_part?: string | null
          created_at?: string
          day?: string
          exercise_type?: string
          group_id: string
          id?: string
          is_dropset?: boolean | null
          is_piramide?: boolean | null
          is_to_failure?: boolean | null
          name: string
          pyramid_reps?: string | null
          reps?: number
          sets?: number
          trainer_id: string
          weight?: number
        }
        Update: {
          body_part?: string | null
          created_at?: string
          day?: string
          exercise_type?: string
          group_id?: string
          id?: string
          is_dropset?: boolean | null
          is_piramide?: boolean | null
          is_to_failure?: boolean | null
          name?: string
          pyramid_reps?: string | null
          reps?: number
          sets?: number
          trainer_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_exercises_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "training_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_levels: {
        Row: {
          content: string | null
          created_at: string
          id: string
          level: string
          plan_type: string
          student_id: string
          trainer_id: string
          unlocked: boolean | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          level?: string
          plan_type: string
          student_id: string
          trainer_id: string
          unlocked?: boolean | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          level?: string
          plan_type?: string
          student_id?: string
          trainer_id?: string
          unlocked?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_prices: {
        Row: {
          created_at: string
          id: string
          level: string
          plan_type: string
          price: number
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          plan_type: string
          price?: number
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          plan_type?: string
          price?: number
          trainer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_initials: string | null
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          mercadopago_alias: string | null
          updated_at: string
          user_id: string
          weight: number | null
          whatsapp_number: string | null
        }
        Insert: {
          age?: number | null
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          mercadopago_alias?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
          whatsapp_number?: string | null
        }
        Update: {
          age?: number | null
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          mercadopago_alias?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      routine_day_config: {
        Row: {
          body_part_1: string | null
          body_part_2: string | null
          created_at: string
          day: string
          id: string
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          body_part_1?: string | null
          body_part_2?: string | null
          created_at?: string
          day: string
          id?: string
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          body_part_1?: string | null
          body_part_2?: string | null
          created_at?: string
          day?: string
          id?: string
          student_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          created_at: string
          id: string
          name: string
          routine_type: string
          status: string
          target_id: string
          target_type: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          routine_type?: string
          status?: string
          target_id: string
          target_type?: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          routine_type?: string
          status?: string
          target_id?: string
          target_type?: string
          trainer_id?: string
        }
        Relationships: []
      }
      seguimiento_personal: {
        Row: {
          actividad_laboral: string | null
          agua_diaria: string | null
          bano_levantarse: string | null
          comidas_por_dia: string | null
          created_at: string
          desayuno_habito: string | null
          dias_entrena: string | null
          dificultad_levantarse: string | null
          entrena: boolean | null
          hora_despertar: string | null
          hora_dormir: string | null
          hora_entrena: string | null
          hora_ideal_despertar: string | null
          id: string
          nivel_estres: string | null
          student_id: string
          tiempo_para_si: string | null
          tipo_entrenamiento: string | null
          updated_at: string
        }
        Insert: {
          actividad_laboral?: string | null
          agua_diaria?: string | null
          bano_levantarse?: string | null
          comidas_por_dia?: string | null
          created_at?: string
          desayuno_habito?: string | null
          dias_entrena?: string | null
          dificultad_levantarse?: string | null
          entrena?: boolean | null
          hora_despertar?: string | null
          hora_dormir?: string | null
          hora_entrena?: string | null
          hora_ideal_despertar?: string | null
          id?: string
          nivel_estres?: string | null
          student_id: string
          tiempo_para_si?: string | null
          tipo_entrenamiento?: string | null
          updated_at?: string
        }
        Update: {
          actividad_laboral?: string | null
          agua_diaria?: string | null
          bano_levantarse?: string | null
          comidas_por_dia?: string | null
          created_at?: string
          desayuno_habito?: string | null
          dias_entrena?: string | null
          dificultad_levantarse?: string | null
          entrena?: boolean | null
          hora_despertar?: string | null
          hora_dormir?: string | null
          hora_entrena?: string | null
          hora_ideal_despertar?: string | null
          id?: string
          nivel_estres?: string | null
          student_id?: string
          tiempo_para_si?: string | null
          tipo_entrenamiento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_meals: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meal_type: string | null
          student_id: string
          title: string
          trainer_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meal_type?: string | null
          student_id: string
          title: string
          trainer_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meal_type?: string | null
          student_id?: string
          title?: string
          trainer_id?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_text: string
          assignment_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          answer_text: string
          assignment_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          answer_text?: string
          assignment_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "survey_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_assignments: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          student_id: string
          survey_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          student_id: string
          survey_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          student_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_assignments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "custom_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "custom_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_changes: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      trainer_students: {
        Row: {
          created_at: string
          id: string
          payment_status: string | null
          plan_alimentacion: string | null
          plan_entrenamiento: string | null
          plan_type: string | null
          routine_next_change_date: string | null
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status?: string | null
          plan_alimentacion?: string | null
          plan_entrenamiento?: string | null
          plan_type?: string | null
          routine_next_change_date?: string | null
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string | null
          plan_alimentacion?: string | null
          plan_entrenamiento?: string | null
          plan_type?: string | null
          routine_next_change_date?: string | null
          student_id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      training_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "training_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      training_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          trainer_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          id: string
          recorded_at: string
          student_id: string
          weight: number
        }
        Insert: {
          id?: string
          recorded_at?: string
          student_id: string
          weight: number
        }
        Update: {
          id?: string
          recorded_at?: string
          student_id?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "trainer" | "student"
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
    Enums: {
      app_role: ["trainer", "student"],
    },
  },
} as const
