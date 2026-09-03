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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      accounts_payable_imports: {
        Row: {
          created_at: string | null
          date: string
          id: string
          source_filename: string
          total_amount: number
          total_bills_count: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          source_filename: string
          total_amount: number
          total_bills_count: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          source_filename?: string
          total_amount?: number
          total_bills_count?: number
        }
        Relationships: []
      }
      agent_reflections: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          outcome_success: boolean
          policy_evaluations: Json | null
          reflection_notes: string
          tool_used: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          outcome_success: boolean
          policy_evaluations?: Json | null
          reflection_notes: string
          tool_used?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          outcome_success?: boolean
          policy_evaluations?: Json | null
          reflection_notes?: string
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reflections_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          api_key: string | null
          bot_api_key: string | null
          bot_url: string | null
          id: string | null
          model: string | null
          provider: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          bot_api_key?: string | null
          bot_url?: string | null
          id?: string | null
          model?: string | null
          provider?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          bot_api_key?: string | null
          bot_url?: string | null
          id?: string | null
          model?: string | null
          provider?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          target_date: string
          title: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          target_date?: string
          title: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          target_date?: string
          title?: string
          user_email?: string | null
          user_id?: string | null
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
      claritas_policies: {
        Row: {
          created_at: string
          id: string
          policy_name: string
          rule_definition: string
          severity: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_name: string
          rule_definition: string
          severity: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_name?: string
          rule_definition?: string
          severity?: string
        }
        Relationships: []
      }
      claritas_prompts: {
        Row: {
          agent_role: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          version: string
        }
        Insert: {
          agent_role: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          version?: string
        }
        Update: {
          agent_role?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          version?: string
        }
        Relationships: []
      }
      conciliation_daily_logs: {
        Row: {
          created_at: string | null
          date: string
          diferenca: number | null
          faturamento_banco: number | null
          id: string
          maquininha: number | null
          na_loja_os: number | null
          pix: number | null
          previsto_ofx: number | null
          status: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          diferenca?: number | null
          faturamento_banco?: number | null
          id?: string
          maquininha?: number | null
          na_loja_os?: number | null
          pix?: number | null
          previsto_ofx?: number | null
          status?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          diferenca?: number | null
          faturamento_banco?: number | null
          id?: string
          maquininha?: number | null
          na_loja_os?: number | null
          pix?: number | null
          previsto_ofx?: number | null
          status?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conciliation_matches: {
        Row: {
          created_at: string | null
          divergence_amount: number | null
          id: string
          ofx_transaction_id: string | null
          rede_transaction_id: string | null
          status: string
          store_id: string
          system_os_number: string | null
          target_date: string
        }
        Insert: {
          created_at?: string | null
          divergence_amount?: number | null
          id?: string
          ofx_transaction_id?: string | null
          rede_transaction_id?: string | null
          status: string
          store_id: string
          system_os_number?: string | null
          target_date: string
        }
        Update: {
          created_at?: string | null
          divergence_amount?: number | null
          id?: string
          ofx_transaction_id?: string | null
          rede_transaction_id?: string | null
          status?: string
          store_id?: string
          system_os_number?: string | null
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "conciliation_matches_ofx_transaction_id_fkey"
            columns: ["ofx_transaction_id"]
            isOneToOne: false
            referencedRelation: "ofx_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliation_matches_rede_transaction_id_fkey"
            columns: ["rede_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliation_matches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_manual_bills: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          due_date: string | null
          external_code: string | null
          id: string
          installment: string | null
          intercompany_entity_id: string | null
          is_intercompany: boolean | null
          matched_os_number: string | null
          payment_date: string | null
          recipient_name: string | null
          store_id: string | null
          title: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          due_date?: string | null
          external_code?: string | null
          id?: string
          installment?: string | null
          intercompany_entity_id?: string | null
          is_intercompany?: boolean | null
          matched_os_number?: string | null
          payment_date?: string | null
          recipient_name?: string | null
          store_id?: string | null
          title: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          due_date?: string | null
          external_code?: string | null
          id?: string
          installment?: string | null
          intercompany_entity_id?: string | null
          is_intercompany?: boolean | null
          matched_os_number?: string | null
          payment_date?: string | null
          recipient_name?: string | null
          store_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_manual_bills_intercompany_entity_id_fkey"
            columns: ["intercompany_entity_id"]
            isOneToOne: false
            referencedRelation: "intercompany_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manual_bills_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_revenue_adjustments: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          title: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          a_receber_manual: number
          caixa_atual: number
          closed_at: string | null
          contas_a_pagar: number
          created_at: string | null
          date: string
          dinheiro_mp: number
          faturamento: number
          faturamento_outros_desc: string | null
          faturamento_outros_valor: number
          id: string
          is_closed: boolean | null
          juros_rede: number
          metadata: Json | null
          notes: string | null
          provisao: number
          saldo_bancario: number
          saldo_negativo_itau: number
          total_patio: number
          total_recebiveis: number
          updated_at: string | null
        }
        Insert: {
          a_receber_manual?: number
          caixa_atual?: number
          closed_at?: string | null
          contas_a_pagar?: number
          created_at?: string | null
          date: string
          dinheiro_mp?: number
          faturamento?: number
          faturamento_outros_desc?: string | null
          faturamento_outros_valor?: number
          id?: string
          is_closed?: boolean | null
          juros_rede?: number
          metadata?: Json | null
          notes?: string | null
          provisao?: number
          saldo_bancario?: number
          saldo_negativo_itau?: number
          total_patio?: number
          total_recebiveis?: number
          updated_at?: string | null
        }
        Update: {
          a_receber_manual?: number
          caixa_atual?: number
          closed_at?: string | null
          contas_a_pagar?: number
          created_at?: string | null
          date?: string
          dinheiro_mp?: number
          faturamento?: number
          faturamento_outros_desc?: string | null
          faturamento_outros_valor?: number
          id?: string
          is_closed?: boolean | null
          juros_rede?: number
          metadata?: Json | null
          notes?: string | null
          provisao?: number
          saldo_bancario?: number
          saldo_negativo_itau?: number
          total_patio?: number
          total_recebiveis?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_daily_logs: {
        Row: {
          a_receber: number | null
          caixa_atual: number | null
          contas_a_pagar: number | null
          created_at: string | null
          date: string
          diferenca: number | null
          faturamento_anterior: number | null
          faturamento_atual: number | null
          fluxo_caixa: number | null
          historico_macro: Json | null
          id: string
          por_loja: Json | null
          saldo_total: number | null
          updated_at: string | null
          variacao_faturamento: number | null
          veiculos_patio: number | null
          veiculos_patio_valor: number | null
        }
        Insert: {
          a_receber?: number | null
          caixa_atual?: number | null
          contas_a_pagar?: number | null
          created_at?: string | null
          date: string
          diferenca?: number | null
          faturamento_anterior?: number | null
          faturamento_atual?: number | null
          fluxo_caixa?: number | null
          historico_macro?: Json | null
          id?: string
          por_loja?: Json | null
          saldo_total?: number | null
          updated_at?: string | null
          variacao_faturamento?: number | null
          veiculos_patio?: number | null
          veiculos_patio_valor?: number | null
        }
        Update: {
          a_receber?: number | null
          caixa_atual?: number | null
          contas_a_pagar?: number | null
          created_at?: string | null
          date?: string
          diferenca?: number | null
          faturamento_anterior?: number | null
          faturamento_atual?: number | null
          fluxo_caixa?: number | null
          historico_macro?: Json | null
          id?: string
          por_loja?: Json | null
          saldo_total?: number | null
          updated_at?: string | null
          variacao_faturamento?: number | null
          veiculos_patio?: number | null
          veiculos_patio_valor?: number | null
        }
        Relationships: []
      }
      estoque_os_pendente: {
        Row: {
          client_name: string | null
          created_at: string
          data_baixa: string | null
          data_os: string
          id: string
          numero_os: string
          status: string
          store_id: string
          valor_os: number
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          data_baixa?: string | null
          data_os: string
          id?: string
          numero_os: string
          status: string
          store_id: string
          valor_os: number
        }
        Update: {
          client_name?: string | null
          created_at?: string
          data_baixa?: string | null
          data_os?: string
          id?: string
          numero_os?: string
          status?: string
          store_id?: string
          valor_os?: number
        }
        Relationships: [
          {
            foreignKeyName: "estoque_os_pendente_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_category_rules: {
        Row: {
          category: string
          created_at: string | null
          id: string
          pattern: string
          priority: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          pattern: string
          priority?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          pattern?: string
          priority?: number | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string | null
          id: string
          month: number
          store_id: string | null
          target_amount: number
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          store_id?: string | null
          target_amount?: number
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          store_id?: string | null
          target_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string | null
          id: string
          target_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          target_date?: string
          user_id?: string | null
        }
        Relationships: []
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
      intercompany_entities: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pix_keys: string[] | null
          store_id: string | null
          type: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pix_keys?: string[] | null
          store_id?: string | null
          type: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pix_keys?: string[] | null
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_entities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_transactions: {
        Row: {
          amount: number
          cnpj_cpf: string | null
          counterpart_name: string | null
          created_at: string
          external_id: string | null
          fee_amount: number | null
          fitid: string | null
          gross_amount: number | null
          icon_type: string | null
          id: string
          import_batch_id: string | null
          manual_category: string | null
          manual_justification: string | null
          match_status: string | null
          matched_ofx_id: string | null
          occurred_at: string
          os_number: string | null
          payment_method: string | null
          previous_balance: number | null
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
          cnpj_cpf?: string | null
          counterpart_name?: string | null
          created_at?: string
          external_id?: string | null
          fee_amount?: number | null
          fitid?: string | null
          gross_amount?: number | null
          icon_type?: string | null
          id?: string
          import_batch_id?: string | null
          manual_category?: string | null
          manual_justification?: string | null
          match_status?: string | null
          matched_ofx_id?: string | null
          occurred_at?: string
          os_number?: string | null
          payment_method?: string | null
          previous_balance?: number | null
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
          cnpj_cpf?: string | null
          counterpart_name?: string | null
          created_at?: string
          external_id?: string | null
          fee_amount?: number | null
          fitid?: string | null
          gross_amount?: number | null
          icon_type?: string | null
          id?: string
          import_batch_id?: string | null
          manual_category?: string | null
          manual_justification?: string | null
          match_status?: string | null
          matched_ofx_id?: string | null
          occurred_at?: string
          os_number?: string | null
          payment_method?: string | null
          previous_balance?: number | null
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
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      oficina_contas: {
        Row: {
          fornecedor: string | null
          id: string
          id_interno: string
          status: string | null
          store_id: string
          tipo: string | null
          updated_at: string | null
          valor_em_aberto: number | null
          valor_original: number | null
          vencimento: string | null
        }
        Insert: {
          fornecedor?: string | null
          id?: string
          id_interno: string
          status?: string | null
          store_id: string
          tipo?: string | null
          updated_at?: string | null
          valor_em_aberto?: number | null
          valor_original?: number | null
          vencimento?: string | null
        }
        Update: {
          fornecedor?: string | null
          id?: string
          id_interno?: string
          status?: string | null
          store_id?: string
          tipo?: string | null
          updated_at?: string | null
          valor_em_aberto?: number | null
          valor_original?: number | null
          vencimento?: string | null
        }
        Relationships: []
      }
      oficina_os_cache: {
        Row: {
          id: string
          os_number: string
          payload_completo: Json | null
          status_cache: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          os_number: string
          payload_completo?: Json | null
          status_cache?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          os_number?: string
          payload_completo?: Json | null
          status_cache?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ofx_transactions: {
        Row: {
          amount: number
          bank_name: string
          cnpj_cpf: string | null
          counterpart_name: string | null
          created_at: string | null
          fitid: string
          id: string
          import_batch_id: string | null
          manual_category: string | null
          manual_justification: string | null
          matched_os_number: string | null
          occurred_at: string
          store_id: string | null
          target_date: string | null
          type: string | null
        }
        Insert: {
          amount: number
          bank_name: string
          cnpj_cpf?: string | null
          counterpart_name?: string | null
          created_at?: string | null
          fitid: string
          id?: string
          import_batch_id?: string | null
          manual_category?: string | null
          manual_justification?: string | null
          matched_os_number?: string | null
          occurred_at: string
          store_id?: string | null
          target_date?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string
          cnpj_cpf?: string | null
          counterpart_name?: string | null
          created_at?: string | null
          fitid?: string
          id?: string
          import_batch_id?: string | null
          manual_category?: string | null
          manual_justification?: string | null
          matched_os_number?: string | null
          occurred_at?: string
          store_id?: string | null
          target_date?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofx_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      patio_os: {
        Row: {
          cash_value: number | null
          client_name: string | null
          closed_at: string | null
          credit_debit_value: number | null
          credit_value: number | null
          days_open: number | null
          debit_value: number | null
          history_log: Json | null
          id: string
          last_payment_date: string | null
          match_status: string | null
          matched_ofx_id: string | null
          opened_at: string
          os_number: string
          paid_value: number
          payment_method: string | null
          pix_transfer_value: number | null
          plate: string
          raw_status: string | null
          status: string
          store_id: string | null
          store_name: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          cash_value?: number | null
          client_name?: string | null
          closed_at?: string | null
          credit_debit_value?: number | null
          credit_value?: number | null
          days_open?: number | null
          debit_value?: number | null
          history_log?: Json | null
          id?: string
          last_payment_date?: string | null
          match_status?: string | null
          matched_ofx_id?: string | null
          opened_at?: string
          os_number: string
          paid_value?: number
          payment_method?: string | null
          pix_transfer_value?: number | null
          plate: string
          raw_status?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          cash_value?: number | null
          client_name?: string | null
          closed_at?: string | null
          credit_debit_value?: number | null
          credit_value?: number | null
          days_open?: number | null
          debit_value?: number | null
          history_log?: Json | null
          id?: string
          last_payment_date?: string | null
          match_status?: string | null
          matched_ofx_id?: string | null
          opened_at?: string
          os_number?: string
          paid_value?: number
          payment_method?: string | null
          pix_transfer_value?: number | null
          plate?: string
          raw_status?: string | null
          status?: string
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
      pos_transactions: {
        Row: {
          created_at: string | null
          dedup_hash: string | null
          fee_amount: number
          gross_amount: number
          id: string
          import_batch_id: string | null
          machine_name: string
          manual_category: string | null
          manual_justification: string | null
          matched_os_number: string | null
          net_amount: number
          occurred_at: string
          payment_method: string
          settled_amount: number | null
          settled_date: string | null
          settlement_status: string | null
          store_id: string | null
          target_date: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dedup_hash?: string | null
          fee_amount: number
          gross_amount: number
          id?: string
          import_batch_id?: string | null
          machine_name: string
          manual_category?: string | null
          manual_justification?: string | null
          matched_os_number?: string | null
          net_amount: number
          occurred_at: string
          payment_method: string
          settled_amount?: number | null
          settled_date?: string | null
          settlement_status?: string | null
          store_id?: string | null
          target_date?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dedup_hash?: string | null
          fee_amount?: number
          gross_amount?: number
          id?: string
          import_batch_id?: string | null
          machine_name?: string
          manual_category?: string | null
          manual_justification?: string | null
          matched_os_number?: string | null
          net_amount?: number
          occurred_at?: string
          payment_method?: string
          settled_amount?: number | null
          settled_date?: string | null
          settlement_status?: string | null
          store_id?: string | null
          target_date?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          can_edit_data: boolean | null
          can_import: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          can_edit_data?: boolean | null
          can_import?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          can_edit_data?: boolean | null
          can_import?: boolean | null
          created_at?: string
          email?: string | null
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
          description: string | null
          discount_value: number | null
          due_date: string
          id: string
          installment: string | null
          interest_value: number | null
          matched_ofx_id: string | null
          os_number: string | null
          paid_value: number | null
          payment_method: string | null
          received_at: string | null
          status: string
          store_id: string | null
          store_name: string | null
          type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          discount_value?: number | null
          due_date: string
          id?: string
          installment?: string | null
          interest_value?: number | null
          matched_ofx_id?: string | null
          os_number?: string | null
          paid_value?: number | null
          payment_method?: string | null
          received_at?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          type: string
          updated_at?: string | null
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          discount_value?: number | null
          due_date?: string
          id?: string
          installment?: string | null
          interest_value?: number | null
          matched_ofx_id?: string | null
          os_number?: string | null
          paid_value?: number | null
          payment_method?: string | null
          received_at?: string | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "receivables_matched_ofx_id_fkey"
            columns: ["matched_ofx_id"]
            isOneToOne: false
            referencedRelation: "ofx_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliacoes_triplas: {
        Row: {
          created_at: string | null
          id: string
          ofx_id: string | null
          os_id: string | null
          rede_id: string | null
          score: number
          store_id: string | null
          tipo_match: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ofx_id?: string | null
          os_id?: string | null
          rede_id?: string | null
          score?: number
          store_id?: string | null
          tipo_match: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ofx_id?: string | null
          os_id?: string | null
          rede_id?: string | null
          score?: number
          store_id?: string | null
          tipo_match?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliacoes_triplas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "patio_os"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliacoes_triplas_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliacoes_triplas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_audit_logs: {
        Row: {
          created_at: string | null
          final_delta: number
          id: string
          initial_delta: number
          is_conforme: boolean
          iterations_count: number
          steps_executed: Json
          summary_snapshot: Json | null
          target_date: string
        }
        Insert: {
          created_at?: string | null
          final_delta: number
          id?: string
          initial_delta: number
          is_conforme?: boolean
          iterations_count?: number
          steps_executed?: Json
          summary_snapshot?: Json | null
          target_date: string
        }
        Update: {
          created_at?: string | null
          final_delta?: number
          id?: string
          initial_delta?: number
          is_conforme?: boolean
          iterations_count?: number
          steps_executed?: Json
          summary_snapshot?: Json | null
          target_date?: string
        }
        Relationships: []
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
          na_loja_os: number | null
          ofx_imported: boolean | null
          os_count: number | null
          os_total: number | null
          previous_balance: number | null
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
          na_loja_os?: number | null
          ofx_imported?: boolean | null
          os_count?: number | null
          os_total?: number | null
          previous_balance?: number | null
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
          na_loja_os?: number | null
          ofx_imported?: boolean | null
          os_count?: number | null
          os_total?: number | null
          previous_balance?: number | null
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
      store_cash_vault: {
        Row: {
          amount: number
          created_at: string | null
          deposited_at: string | null
          deposited_by: string | null
          description: string
          entry_date: string
          id: string
          notes: string | null
          os_number_ref: string | null
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          deposited_at?: string | null
          deposited_by?: string | null
          description: string
          entry_date: string
          id?: string
          notes?: string | null
          os_number_ref?: string | null
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          deposited_at?: string | null
          deposited_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          notes?: string | null
          os_number_ref?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_cash_vault_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_file_mappings: {
        Row: {
          created_at: string | null
          file_alias: string
          id: string
          store_id: string | null
          store_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_alias: string
          id?: string
          store_id?: string | null
          store_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_alias?: string
          id?: string
          store_id?: string | null
          store_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_file_mappings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          account_limit: number | null
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
          account_limit?: number | null
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
          account_limit?: number | null
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
      system_logs: {
        Row: {
          context: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          context: string
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
        }
        Update: {
          context?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      transactions: {
        Row: {
          amount: number | null
          cnpj_cpf: string | null
          counterpart_name: string | null
          created_at: string | null
          fee_amount: number | null
          fitid: string | null
          gross_amount: number | null
          icon_type: string | null
          id: string | null
          import_batch_id: string | null
          manual_category: string | null
          manual_justification: string | null
          occurred_at: string | null
          os_number: string | null
          payment_method: string | null
          previous_balance: number | null
          source: string | null
          status: string | null
          store_id: string | null
          store_name: string | null
          subtitle: string | null
          target_date: string | null
          title: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_can_edit_data?: boolean
          p_can_import?: boolean
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: string
        }
        Returns: Json
      }
      admin_update_user_permissions: {
        Args: {
          p_can_edit_data: boolean
          p_can_import: boolean
          p_full_name: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
      auto_match_receivables: {
        Args: { p_date?: string; p_store_id?: string }
        Returns: Json
      }
      auto_match_transactions: { Args: { p_date: string }; Returns: Json }
      calculate_daily_conciliation: { Args: { p_date: string }; Returns: Json }
      categorize_orphan_transaction: {
        Args: { p_category: string; p_justification: string; p_tx_id: string }
        Returns: Json
      }
      clear_all_financial_data: { Args: never; Returns: Json }
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
      get_conciliation_breakdown: {
        Args: { p_date: string; p_store_id: string }
        Returns: Json
      }
      get_daily_reconciliation_summary:
        | { Args: { p_date: string }; Returns: Json }
        | {
            Args: { p_force_dynamic?: boolean; p_target_date?: string }
            Returns: Json
          }
      get_dashboard_metrics: { Args: { p_date: string }; Returns: Json }
      get_patio_summary: { Args: never; Returns: Json }
      get_raw_ofx_data: {
        Args: { p_date: string; p_store_id: string }
        Returns: Json
      }
      get_raw_os_data: {
        Args: { p_date: string; p_store_id: string }
        Returns: {
          closed_at: string
          credit_debit_value: number
          opened_at: string
          os_number: string
          paid_value: number
          payment_method: string
          pix_transfer_value: number
          remaining_value: number
          status: string
          total_value: number
        }[]
      }
      get_raw_rede_data: {
        Args: { p_date: string; p_store_id: string }
        Returns: {
          fee_amount: number
          fee_percentage: number
          gross_amount: number
          id: string
          machine_name: string
          matched_os_number: string
          net_amount: number
          occurred_at: string
          payment_method: string
        }[]
      }
      get_receivables_summary: { Args: { p_date?: string }; Returns: Json }
      get_store_financial_stats: {
        Args: { p_end_date: string; p_start_date: string; p_store_id: string }
        Returns: Json
      }
      get_store_pos_triple_reconciliation: {
        Args: { p_target_date?: string }
        Returns: Json
      }
      get_system_users: { Args: never; Returns: Json }
      liquidate_legacy_os: { Args: { p_os_ids: string[] }; Returns: Json }
      match_bank_transactions: {
        Args: { p_date: string; p_store_id: string }
        Returns: undefined
      }
      process_marco_zero_import: {
        Args: { p_global: Json; p_stores: Json; p_target_date: string }
        Returns: Json
      }
      purge_daily_financial_data: { Args: { p_date: string }; Returns: Json }
      run_autonomous_reconciliation_loop: {
        Args: { p_date: string }
        Returns: Json
      }
      test_ramal_1: { Args: { p_date: string }; Returns: Json }
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
