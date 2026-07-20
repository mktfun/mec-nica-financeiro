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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          amount: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          os_number: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          store_id: string | null
          store_name: string
          time: string | null
          title: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          os_number?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          store_id?: string | null
          store_name: string
          time?: string | null
          title: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          os_number?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          store_id?: string | null
          store_name?: string
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_runs: {
        Row: {
          errors: Json | null
          finished_at: string | null
          id: string
          log_text: string | null
          screenshot_urls: string[] | null
          started_at: string
          status: string
          stores_processed: number | null
          triggered_by: string | null
        }
        Insert: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          log_text?: string | null
          screenshot_urls?: string[] | null
          started_at?: string
          status?: string
          stores_processed?: number | null
          triggered_by?: string | null
        }
        Update: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          log_text?: string | null
          screenshot_urls?: string[] | null
          started_at?: string
          status?: string
          stores_processed?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      cash_registers: {
        Row: {
          created_at: string | null
          date: string
          declared_amount: number | null
          divergence: number | null
          expected_amount: number
          id: string
          status: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          declared_amount?: number | null
          divergence?: number | null
          expected_amount?: number
          id?: string
          status?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          declared_amount?: number | null
          divergence?: number | null
          expected_amount?: number
          id?: string
          status?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string | null
          id: string
          os_count: number | null
          receivables_count: number | null
          store_id: string | null
          store_name: string
          target_date: string
          total_dinheiro: number | null
          total_os: number | null
          total_paid_all: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          os_count?: number | null
          receivables_count?: number | null
          store_id?: string | null
          store_name: string
          target_date: string
          total_dinheiro?: number | null
          total_os?: number | null
          total_paid_all?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          os_count?: number | null
          receivables_count?: number | null
          store_id?: string | null
          store_name?: string
          target_date?: string
          total_dinheiro?: number | null
          total_os?: number | null
          total_paid_all?: number | null
        }
        Relationships: []
      }

      patio_os: {
        Row: {
          closed_at: string | null
          days_open: number | null
          history_log: Json | null
          id: string
          opened_at: string
          os_number: string
          paid_value: number
          payment_method: string | null
          plate: string
          status: string
          raw_status: string | null
          credit_debit_value: number | null
          pix_transfer_value: number | null
          store_id: string | null
          store_name: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          days_open?: number | null
          history_log?: Json | null
          id?: string
          opened_at?: string
          os_number: string
          paid_value?: number
          payment_method?: string | null
          plate: string
          status?: string
          raw_status?: string | null
          credit_debit_value?: number | null
          pix_transfer_value?: number | null
          store_id?: string | null
          store_name?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          days_open?: number | null
          history_log?: Json | null
          id?: string
          opened_at?: string
          os_number?: string
          paid_value?: number
          payment_method?: string | null
          plate?: string
          status?: string
          raw_status?: string | null
          credit_debit_value?: number | null
          pix_transfer_value?: number | null
          store_id?: string | null
          store_name?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patio_os_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          created_at: string
          date: string
          due_date: string
          id: string
          received_at: string | null
          status: string
          store_id: string | null
          store_name: string | null
          type: string
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          due_date: string
          id?: string
          received_at?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          type: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          due_date?: string
          id?: string
          received_at?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          bank_divergence: number | null
          bank_total: number | null
          bot_run_id: string | null
          created_at: string
          daily_cash: number | null
          date: string
          divergence: number | null
          financial_total: number | null
          id: string
          machine_fees: number | null
          machine_total: number | null
          ofx_imported: boolean | null
          os_count: number | null
          os_total: number | null
          processed_at: string | null
          status: string
          store_id: string | null
          top_error: string | null
        }
        Insert: {
          bank_divergence?: number | null
          bank_total?: number | null
          bot_run_id?: string | null
          created_at?: string
          daily_cash?: number | null
          date: string
          divergence?: number | null
          financial_total?: number | null
          id?: string
          machine_fees?: number | null
          machine_total?: number | null
          ofx_imported?: boolean | null
          os_count?: number | null
          os_total?: number | null
          processed_at?: string | null
          status?: string
          store_id?: string | null
          top_error?: string | null
        }
        Update: {
          bank_divergence?: number | null
          bank_total?: number | null
          bot_run_id?: string | null
          created_at?: string
          daily_cash?: number | null
          date?: string
          divergence?: number | null
          financial_total?: number | null
          id?: string
          machine_fees?: number | null
          machine_total?: number | null
          ofx_imported?: boolean | null
          os_count?: number | null
          os_total?: number | null
          processed_at?: string | null
          status?: string
          store_id?: string | null
          top_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          avatar_url: string | null
          created_at: string
          id: string
          manager: string | null
          mechanics: string[] | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          id: string
          manager?: string | null
          mechanics?: string[] | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          manager?: string | null
          mechanics?: string[] | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          icon_type: string | null
          id: string
          occurred_at: string
          os_number: string | null
          payment_method: string | null
          source: string | null
          store_id: string | null
          store_name: string | null
          subtitle: string | null
          target_date: string | null
          title: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          icon_type?: string | null
          id?: string
          occurred_at?: string
          os_number?: string | null
          payment_method?: string | null
          source?: string | null
          store_id?: string | null
          store_name?: string | null
          subtitle?: string | null
          target_date?: string | null
          title: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          icon_type?: string | null
          id?: string
          occurred_at?: string
          os_number?: string | null
          payment_method?: string | null
          source?: string | null
          store_id?: string | null
          store_name?: string | null
          subtitle?: string | null
          target_date?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_import_batch: {
        Args: {
          p_batch_created_ats?: string[]
          p_is_expense: boolean
          p_log_ids: string[]
          p_store_id: string
          p_target_dates: string[]
        }
        Returns: undefined
      }
      match_bank_transactions: {
        Args: { p_date: string; p_store_id: string }
        Returns: undefined
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
