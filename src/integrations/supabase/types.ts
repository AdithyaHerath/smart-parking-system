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
      bookings: {
        Row: {
          booking_time: string
          created_at: string
          fee_deducted_at: string | null
          fee_lkr: number
          id: string
          is_walkin: boolean
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          booking_time: string
          created_at?: string
          fee_deducted_at?: string | null
          fee_lkr: number
          id?: string
          is_walkin?: boolean
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          booking_time?: string
          created_at?: string
          fee_deducted_at?: string | null
          fee_lkr?: number
          id?: string
          is_walkin?: boolean
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "parking_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_actions: {
        Row: {
          acted_by: string
          action: Database["public"]["Enums"]["complaint_status"]
          complaint_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          acted_by: string
          action: Database["public"]["Enums"]["complaint_status"]
          complaint_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          acted_by?: string
          action?: Database["public"]["Enums"]["complaint_status"]
          complaint_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_actions_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          reporter_id: string
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          violation_plate: string
          violation_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          id?: string
          reporter_id: string
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          violation_plate: string
          violation_type?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          violation_plate?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      parking_slots: {
        Row: {
          created_at: string
          id: string
          slot_code: string
          status: Database["public"]["Enums"]["slot_status"]
          type: Database["public"]["Enums"]["slot_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          slot_code: string
          status?: Database["public"]["Enums"]["slot_status"]
          type: Database["public"]["Enums"]["slot_type"]
        }
        Update: {
          created_at?: string
          id?: string
          slot_code?: string
          status?: Database["public"]["Enums"]["slot_status"]
          type?: Database["public"]["Enums"]["slot_type"]
        }
        Relationships: []
      }
      penalties: {
        Row: {
          amount_lkr: number
          complaint_id: string
          created_at: string
          id: string
          offense_number: number
          user_id: string
        }
        Insert: {
          amount_lkr: number
          complaint_id: string
          created_at?: string
          id?: string
          offense_number: number
          user_id: string
        }
        Update: {
          amount_lkr?: number
          complaint_id?: string
          created_at?: string
          id?: string
          offense_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: true
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_lkr: number
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount_lkr: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount_lkr?: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      vehicles: {
        Row: {
          created_at: string
          id: string
          plate_number: string
          type: Database["public"]["Enums"]["vehicle_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plate_number: string
          type: Database["public"]["Enums"]["vehicle_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plate_number?: string
          type?: Database["public"]["Enums"]["vehicle_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_lkr: number
          id: string
          user_id: string
        }
        Insert: {
          balance_lkr?: number
          id?: string
          user_id: string
        }
        Update: {
          balance_lkr?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_penalty_report: {
        Args: never
        Returns: {
          amount_lkr: number
          created_at: string
          current_balance: number
          offense_number: number
          penalty_id: string
          plate_number: string
          student_id: string
          user_name: string
          violation_count: number
        }[]
      }
      get_admin_revenue_report: {
        Args: { _date: string }
        Returns: {
          amount_lkr: number
          created_at: string
          description: string
          student_id: string
          transaction_id: string
          type: string
          user_name: string
        }[]
      }
      get_cashier_topup_report: {
        Args: { _date: string }
        Returns: {
          amount_lkr: number
          created_at: string
          student_id: string
          user_name: string
        }[]
      }
      get_cashier_topup_stats: {
        Args: { _since: string }
        Returns: {
          today_topups: number
          total_amount: number
        }[]
      }
      get_email_by_student_id: {
        Args: { _student_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "super_admin" | "security" | "cashier"
      booking_status:
        | "pending"
        | "confirmed"
        | "arrived"
        | "completed"
        | "cancelled"
        | "expired"
      complaint_status: "pending" | "accepted" | "declined"
      slot_status: "free" | "booked" | "arrived"
      slot_type: "car" | "motorbike"
      transaction_type:
        | "topup"
        | "parking_fee"
        | "penalty"
        | "walkin_surcharge"
        | "refund"
      vehicle_type: "car" | "motorbike"
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
      app_role: ["student", "super_admin", "security", "cashier"],
      booking_status: [
        "pending",
        "confirmed",
        "arrived",
        "completed",
        "cancelled",
        "expired",
      ],
      complaint_status: ["pending", "accepted", "declined"],
      slot_status: ["free", "booked", "arrived"],
      slot_type: ["car", "motorbike"],
      transaction_type: [
        "topup",
        "parking_fee",
        "penalty",
        "walkin_surcharge",
        "refund",
      ],
      vehicle_type: ["car", "motorbike"],
    },
  },
} as const
