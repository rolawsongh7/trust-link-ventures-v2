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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          completed_at: string | null
          created_at: string
          deletion_reason: string | null
          id: string
          scheduled_for: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deletion_reason?: string | null
          id?: string
          scheduled_for: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deletion_reason?: string | null
          id?: string
          scheduled_for?: string
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_detection_settings: {
        Row: {
          auto_block_threshold: number
          created_at: string
          enable_device_fingerprint_checks: boolean
          enable_location_analysis: boolean
          enable_login_pattern_detection: boolean
          enable_velocity_checks: boolean
          id: string
          sensitivity_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_block_threshold?: number
          created_at?: string
          enable_device_fingerprint_checks?: boolean
          enable_location_analysis?: boolean
          enable_login_pattern_detection?: boolean
          enable_velocity_checks?: boolean
          id?: string
          sensitivity_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_block_threshold?: number
          created_at?: string
          enable_device_fingerprint_checks?: boolean
          enable_location_analysis?: boolean
          enable_login_pattern_detection?: boolean
          enable_velocity_checks?: boolean
          id?: string
          sensitivity_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          changes: Json | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          changes?: Json | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          changes?: Json | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          preferred_grade: string | null
          product_description: string | null
          product_name: string
          quantity: number
          specifications: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          preferred_grade?: string | null
          product_description?: string | null
          product_name: string
          quantity?: number
          specifications?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          preferred_grade?: string | null
          product_description?: string | null
          product_name?: string
          quantity?: number
          specifications?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          attachments: Json | null
          communication_date: string
          communication_type:
            | Database["public"]["Enums"]["communication_type"]
            | null
          completed_date: string | null
          contact_person: string | null
          content: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: string | null
          id: string
          ip_address: unknown
          issue_id: string | null
          lead_id: string | null
          order_id: string | null
          parent_communication_id: string | null
          read_at: string | null
          scheduled_date: string | null
          subject: string | null
          submission_metadata: Json | null
          thread_id: string | null
          thread_position: number | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          attachments?: Json | null
          communication_date?: string
          communication_type?:
            | Database["public"]["Enums"]["communication_type"]
            | null
          completed_date?: string | null
          contact_person?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string | null
          id?: string
          ip_address?: unknown
          issue_id?: string | null
          lead_id?: string | null
          order_id?: string | null
          parent_communication_id?: string | null
          read_at?: string | null
          scheduled_date?: string | null
          subject?: string | null
          submission_metadata?: Json | null
          thread_id?: string | null
          thread_position?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          attachments?: Json | null
          communication_date?: string
          communication_type?:
            | Database["public"]["Enums"]["communication_type"]
            | null
          completed_date?: string | null
          contact_person?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string | null
          id?: string
          ip_address?: unknown
          issue_id?: string | null
          lead_id?: string | null
          order_id?: string | null
          parent_communication_id?: string | null
          read_at?: string | null
          scheduled_date?: string | null
          subject?: string | null
          submission_metadata?: Json | null
          thread_id?: string | null
          thread_position?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "order_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_parent_communication_id_fkey"
            columns: ["parent_communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_history: {
        Row: {
          consent_data: Json
          consent_type: string
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_data?: Json
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_data?: Json
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      csp_violations: {
        Row: {
          blocked_uri: string | null
          column_number: number | null
          created_at: string
          document_uri: string | null
          id: string
          ip_address: unknown
          line_number: number | null
          source_file: string | null
          user_agent: string | null
          user_id: string | null
          violated_directive: string | null
        }
        Insert: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          document_uri?: string | null
          id?: string
          ip_address?: unknown
          line_number?: number | null
          source_file?: string | null
          user_agent?: string | null
          user_id?: string | null
          violated_directive?: string | null
        }
        Update: {
          blocked_uri?: string | null
          column_number?: number | null
          created_at?: string
          document_uri?: string | null
          id?: string
          ip_address?: unknown
          line_number?: number | null
          source_file?: string | null
          user_agent?: string | null
          user_id?: string | null
          violated_directive?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          additional_directions: string | null
          area: string | null
          city: string
          created_at: string | null
          customer_id: string | null
          ghana_digital_address: string
          id: string
          is_default: boolean | null
          phone_number: string
          receiver_name: string
          region: string
          street_address: string
          updated_at: string | null
        }
        Insert: {
          additional_directions?: string | null
          area?: string | null
          city: string
          created_at?: string | null
          customer_id?: string | null
          ghana_digital_address: string
          id?: string
          is_default?: boolean | null
          phone_number: string
          receiver_name: string
          region: string
          street_address: string
          updated_at?: string | null
        }
        Update: {
          additional_directions?: string | null
          area?: string | null
          city?: string
          created_at?: string | null
          customer_id?: string | null
          ghana_digital_address?: string
          id?: string
          is_default?: boolean | null
          phone_number?: string
          receiver_name?: string
          region?: string
          street_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          annual_revenue: number | null
          assigned_to: string | null
          biometric_device_id: string | null
          biometric_enabled: boolean | null
          biometric_enrolled_at: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          customer_status: string | null
          email: string | null
          id: string
          industry: string | null
          last_contact_date: string | null
          last_password_changed: string | null
          notes: string | null
          onboarding_completed_at: string | null
          onboarding_skipped_at: string | null
          onboarding_step: number | null
          phone: string | null
          priority: string | null
          tags: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          annual_revenue?: number | null
          assigned_to?: string | null
          biometric_device_id?: string | null
          biometric_enabled?: boolean | null
          biometric_enrolled_at?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_status?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          last_password_changed?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          onboarding_step?: number | null
          phone?: string | null
          priority?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          annual_revenue?: number | null
          assigned_to?: string | null
          biometric_device_id?: string | null
          biometric_enabled?: boolean | null
          biometric_enrolled_at?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_status?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          last_password_changed?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          onboarding_step?: number | null
          phone?: string | null
          priority?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      delivery_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          order_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          order_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          order_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_fingerprints: {
        Row: {
          created_at: string
          device_info: Json | null
          fingerprint_hash: string
          first_seen: string
          id: string
          last_seen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          fingerprint_hash: string
          first_seen?: string
          id?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          fingerprint_hash?: string
          first_seen?: string
          id?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          metadata: Json | null
          order_id: string | null
          quote_id: string | null
          recipient_email: string
          resend_id: string | null
          retry_count: number | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          quote_id?: string | null
          recipient_email: string
          resend_id?: string | null
          retry_count?: number | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          order_id?: string | null
          quote_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          retry_count?: number | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          email: string
          id: string
          ip_address: unknown
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          created_at: string
          file_hash: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          metadata: Json | null
          storage_path: string | null
          updated_at: string
          upload_ip: unknown
          user_id: string
          validation_errors: string[] | null
          validation_status: string
          virus_scan_status: string | null
        }
        Insert: {
          created_at?: string
          file_hash?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          metadata?: Json | null
          storage_path?: string | null
          updated_at?: string
          upload_ip?: unknown
          user_id: string
          validation_errors?: string[] | null
          validation_status?: string
          virus_scan_status?: string | null
        }
        Update: {
          created_at?: string
          file_hash?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          metadata?: Json | null
          storage_path?: string | null
          updated_at?: string
          upload_ip?: unknown
          user_id?: string
          validation_errors?: string[] | null
          validation_status?: string
          virus_scan_status?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          due_date: string | null
          file_url: string | null
          id: string
          invoice_number: string
          invoice_type: string
          issue_date: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_terms: string | null
          quote_id: string | null
          sent_at: string | null
          shipping_fee: number | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number: string
          invoice_type: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          sent_at?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          sent_at?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          ip_address: unknown
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          ip_address: unknown
          lead_score: number | null
          notes: string | null
          probability: number | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          submission_metadata: Json | null
          title: string | null
          updated_at: string
          value: number | null
          verification_status: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          ip_address?: unknown
          lead_score?: number | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          submission_metadata?: Json | null
          title?: string | null
          updated_at?: string
          value?: number | null
          verification_status?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          ip_address?: unknown
          lead_score?: number | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          submission_metadata?: Json | null
          title?: string | null
          updated_at?: string
          value?: number | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          quote_id: string | null
          rfq_id: string | null
          supplier_email: string
          token: string
          token_type: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          quote_id?: string | null
          rfq_id?: string | null
          supplier_email: string
          token: string
          token_type?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          quote_id?: string | null
          rfq_id?: string | null
          supplier_email?: string
          token?: string
          token_type?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      mfa_login_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      network_security_settings: {
        Row: {
          block_tor: boolean
          block_vpn: boolean
          created_at: string
          enable_geo_blocking: boolean
          id: string
          risk_threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          block_tor?: boolean
          block_vpn?: boolean
          created_at?: string
          enable_geo_blocking?: boolean
          id?: string
          risk_threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          block_tor?: boolean
          block_vpn?: boolean
          created_at?: string
          enable_geo_blocking?: boolean
          id?: string
          risk_threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown
          source: string | null
          status: string | null
          subscription_date: string
          updated_at: string
          verification_sent_at: string | null
          verification_token: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          source?: string | null
          status?: string | null
          subscription_date?: string
          updated_at?: string
          verification_sent_at?: string | null
          verification_token?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          source?: string | null
          status?: string | null
          subscription_date?: string
          updated_at?: string
          verification_sent_at?: string | null
          verification_token?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          admin_notification_settings: Json | null
          created_at: string
          digest_frequency: string
          email_enabled: boolean
          id: string
          marketing: boolean
          order_updates: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quote_updates: boolean
          security_alerts: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notification_settings?: Json | null
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          marketing?: boolean
          order_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quote_updates?: boolean
          security_alerts?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notification_settings?: Json | null
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          marketing?: boolean
          order_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quote_updates?: boolean
          security_alerts?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          actual_close_date: string | null
          assigned_to: string | null
          close_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          name: string
          probability: number | null
          source: string | null
          stage: string
          updated_at: string
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          assigned_to?: string | null
          close_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          probability?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          assigned_to?: string | null
          close_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          probability?: number | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_issues: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          issue_type: Database["public"]["Enums"]["order_issue_type"]
          order_id: string
          photos: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["order_issue_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          issue_type: Database["public"]["Enums"]["order_issue_type"]
          order_id: string
          photos?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["order_issue_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          issue_type?: Database["public"]["Enums"]["order_issue_type"]
          order_id?: string
          photos?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["order_issue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_issues_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_description: string | null
          product_name: string
          quantity: number
          specifications: string | null
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_description?: string | null
          product_name: string
          quantity?: number
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_description?: string | null
          product_name?: string
          quantity?: number
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_status: string
          old_status: string | null
          order_id: string
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_status: string
          old_status?: string | null
          order_id: string
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_status?: string
          old_status?: string | null
          order_id?: string
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          carrier: string | null
          carrier_name: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          customer_id: string | null
          delivered_at: string | null
          delivered_by: string | null
          delivery_address_confirmed_at: string | null
          delivery_address_id: string | null
          delivery_address_requested_at: string | null
          delivery_notes: string | null
          delivery_proof_url: string | null
          delivery_signature: string | null
          delivery_window: string | null
          estimated_delivery_date: string | null
          failed_delivery_at: string | null
          failed_delivery_count: number | null
          failed_delivery_reason: string | null
          ghipss_metadata: Json | null
          ghipss_reference: string | null
          ghipss_status: string | null
          ghipss_transaction_id: string | null
          id: string
          internal_notes: string | null
          manual_confirmation_method: string | null
          manual_confirmation_notes: string | null
          notes: string | null
          order_number: string
          payment_amount_confirmed: number | null
          payment_amount_paid: number | null
          payment_channel: string | null
          payment_confirmed_at: string | null
          payment_gateway: string | null
          payment_initiated_at: string | null
          payment_method: string | null
          payment_mismatch_acknowledged: boolean | null
          payment_proof_uploaded_at: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          payment_rejected_at: string | null
          payment_rejected_by: string | null
          payment_status_reason: string | null
          payment_verification_notes: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          processing_started_at: string | null
          proof_of_delivery_url: string | null
          quote_id: string | null
          ready_to_ship_at: string | null
          shipped_at: string | null
          source_quote_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["order_status_enum"]
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          carrier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_address_confirmed_at?: string | null
          delivery_address_id?: string | null
          delivery_address_requested_at?: string | null
          delivery_notes?: string | null
          delivery_proof_url?: string | null
          delivery_signature?: string | null
          delivery_window?: string | null
          estimated_delivery_date?: string | null
          failed_delivery_at?: string | null
          failed_delivery_count?: number | null
          failed_delivery_reason?: string | null
          ghipss_metadata?: Json | null
          ghipss_reference?: string | null
          ghipss_status?: string | null
          ghipss_transaction_id?: string | null
          id?: string
          internal_notes?: string | null
          manual_confirmation_method?: string | null
          manual_confirmation_notes?: string | null
          notes?: string | null
          order_number: string
          payment_amount_confirmed?: number | null
          payment_amount_paid?: number | null
          payment_channel?: string | null
          payment_confirmed_at?: string | null
          payment_gateway?: string | null
          payment_initiated_at?: string | null
          payment_method?: string | null
          payment_mismatch_acknowledged?: boolean | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_rejected_at?: string | null
          payment_rejected_by?: string | null
          payment_status_reason?: string | null
          payment_verification_notes?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          processing_started_at?: string | null
          proof_of_delivery_url?: string | null
          quote_id?: string | null
          ready_to_ship_at?: string | null
          shipped_at?: string | null
          source_quote_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          carrier_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_address_confirmed_at?: string | null
          delivery_address_id?: string | null
          delivery_address_requested_at?: string | null
          delivery_notes?: string | null
          delivery_proof_url?: string | null
          delivery_signature?: string | null
          delivery_window?: string | null
          estimated_delivery_date?: string | null
          failed_delivery_at?: string | null
          failed_delivery_count?: number | null
          failed_delivery_reason?: string | null
          ghipss_metadata?: Json | null
          ghipss_reference?: string | null
          ghipss_status?: string | null
          ghipss_transaction_id?: string | null
          id?: string
          internal_notes?: string | null
          manual_confirmation_method?: string | null
          manual_confirmation_notes?: string | null
          notes?: string | null
          order_number?: string
          payment_amount_confirmed?: number | null
          payment_amount_paid?: number | null
          payment_channel?: string | null
          payment_confirmed_at?: string | null
          payment_gateway?: string | null
          payment_initiated_at?: string | null
          payment_method?: string | null
          payment_mismatch_acknowledged?: boolean | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_rejected_at?: string | null
          payment_rejected_by?: string | null
          payment_status_reason?: string | null
          payment_verification_notes?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          processing_started_at?: string | null
          proof_of_delivery_url?: string | null
          quote_id?: string | null
          ready_to_ship_at?: string | null
          shipped_at?: string | null
          source_quote_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["order_status_enum"]
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          strength_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          strength_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          strength_score?: number
          user_id?: string
        }
        Relationships: []
      }
      password_policies: {
        Row: {
          created_at: string
          id: number
          max_age_days: number | null
          min_length: number
          prevent_reuse_count: number | null
          require_lowercase: boolean
          require_numbers: boolean
          require_special_chars: boolean
          require_uppercase: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          max_age_days?: number | null
          min_length?: number
          prevent_reuse_count?: number | null
          require_lowercase?: boolean
          require_numbers?: boolean
          require_special_chars?: boolean
          require_uppercase?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          max_age_days?: number | null
          min_length?: number
          prevent_reuse_count?: number | null
          require_lowercase?: boolean
          require_numbers?: boolean
          require_special_chars?: boolean
          require_uppercase?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_phone: string | null
          failed_at: string | null
          ghipss_reference: string
          ghipss_response: Json | null
          ghipss_transaction_id: string | null
          id: string
          initiated_at: string | null
          last_verification_at: string | null
          notes: string | null
          order_id: string | null
          payment_channel: string | null
          status: string
          updated_at: string | null
          verification_attempts: number | null
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          ghipss_reference: string
          ghipss_response?: Json | null
          ghipss_transaction_id?: string | null
          id?: string
          initiated_at?: string | null
          last_verification_at?: string | null
          notes?: string | null
          order_id?: string | null
          payment_channel?: string | null
          status: string
          updated_at?: string | null
          verification_attempts?: number | null
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_phone?: string | null
          failed_at?: string | null
          ghipss_reference?: string
          ghipss_response?: Json | null
          ghipss_transaction_id?: string | null
          id?: string
          initiated_at?: string | null
          last_verification_at?: string | null
          notes?: string | null
          order_id?: string | null
          payment_channel?: string | null
          status?: string
          updated_at?: string | null
          verification_attempts?: number | null
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          position: number
          probability: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          position: number
          probability?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number
          probability?: number | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_approvals: {
        Row: {
          approved_at: string
          created_at: string
          customer_email: string
          customer_notes: string | null
          decision: string
          id: string
          ip_address: unknown
          quote_id: string
          token: string
          user_agent: string | null
        }
        Insert: {
          approved_at?: string
          created_at?: string
          customer_email: string
          customer_notes?: string | null
          decision: string
          id?: string
          ip_address?: unknown
          quote_id: string
          token: string
          user_agent?: string | null
        }
        Update: {
          approved_at?: string
          created_at?: string
          customer_email?: string
          customer_notes?: string | null
          decision?: string
          id?: string
          ip_address?: unknown
          quote_id?: string
          token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          product_description: string | null
          product_name: string
          quantity: number
          quote_id: string
          specifications: string | null
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name: string
          quantity?: number
          quote_id: string
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          specifications?: string | null
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_items: {
        Row: {
          created_at: string
          id: string
          preferred_grade: string | null
          product_name: string
          quantity: number
          quote_request_id: string
          specifications: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_grade?: string | null
          product_name: string
          quantity?: number
          quote_request_id: string
          specifications?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_grade?: string | null
          product_name?: string
          quantity?: number
          quote_request_id?: string
          specifications?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string | null
          delivery_address_id: string | null
          expected_delivery_date: string | null
          id: string
          lead_company_name: string | null
          lead_contact_name: string | null
          lead_country: string | null
          lead_email: string | null
          lead_industry: string | null
          lead_phone: string | null
          message: string | null
          quote_number: string | null
          request_type: string
          status: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_address_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          lead_company_name?: string | null
          lead_contact_name?: string | null
          lead_country?: string | null
          lead_email?: string | null
          lead_industry?: string | null
          lead_phone?: string | null
          message?: string | null
          quote_number?: string | null
          request_type?: string
          status?: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_address_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          lead_company_name?: string | null
          lead_contact_name?: string | null
          lead_country?: string | null
          lead_email?: string | null
          lead_industry?: string | null
          lead_phone?: string | null
          message?: string | null
          quote_number?: string | null
          request_type?: string
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_revisions: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_id: string
          customer_note: string | null
          id: string
          quote_id: string
          request_type: string
          requested_by_user_id: string | null
          requested_changes: Json
          revision_number: number
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_id: string
          customer_note?: string | null
          id?: string
          quote_id: string
          request_type: string
          requested_by_user_id?: string | null
          requested_changes?: Json
          revision_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_id?: string
          customer_note?: string | null
          id?: string
          quote_id?: string
          request_type?: string
          requested_by_user_id?: string | null
          requested_changes?: Json
          revision_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_revisions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_status: string
          old_status: string | null
          quote_id: string
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_status: string
          old_status?: string | null
          quote_id: string
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_status?: string
          old_status?: string | null
          quote_id?: string
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_submissions: {
        Row: {
          currency: string | null
          delivery_date: string | null
          file_url: string | null
          id: string
          magic_token: string
          metadata: Json | null
          notes: string | null
          quote_amount: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          rfq_id: string
          status: string | null
          submitted_at: string
          supplier_company: string | null
          supplier_email: string
          supplier_name: string
          supplier_phone: string | null
          validity_days: number | null
        }
        Insert: {
          currency?: string | null
          delivery_date?: string | null
          file_url?: string | null
          id?: string
          magic_token: string
          metadata?: Json | null
          notes?: string | null
          quote_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rfq_id: string
          status?: string | null
          submitted_at?: string
          supplier_company?: string | null
          supplier_email: string
          supplier_name: string
          supplier_phone?: string | null
          validity_days?: number | null
        }
        Update: {
          currency?: string | null
          delivery_date?: string | null
          file_url?: string | null
          id?: string
          magic_token?: string
          metadata?: Json | null
          notes?: string | null
          quote_amount?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rfq_id?: string
          status?: string | null
          submitted_at?: string
          supplier_company?: string | null
          supplier_email?: string
          supplier_name?: string
          supplier_phone?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      quote_view_analytics: {
        Row: {
          id: string
          ip_address: unknown
          quote_id: string | null
          sections_viewed: Json | null
          token: string
          user_agent: string | null
          view_duration: number | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          quote_id?: string | null
          sections_viewed?: Json | null
          token: string
          user_agent?: string | null
          view_duration?: number | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          quote_id?: string | null
          sections_viewed?: Json | null
          token?: string
          user_agent?: string | null
          view_duration?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_view_analytics_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_view_tokens: {
        Row: {
          access_count: number | null
          created_at: string
          customer_email: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          quote_id: string
          token: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string
          customer_email: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          quote_id: string
          token?: string
        }
        Update: {
          access_count?: number | null
          created_at?: string
          customer_email?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          quote_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_view_tokens_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conversion_method: string | null
          conversion_notes: string | null
          conversion_type: string | null
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          file_url: string | null
          final_file_url: string | null
          id: string
          lead_id: string | null
          linked_quote_request_id: string | null
          notes: string | null
          origin_type: string | null
          quote_number: string
          sent_at: string | null
          shipping_fee: number | null
          status: string | null
          subtotal: number | null
          supplier_quote_uploaded_at: string | null
          tax_amount: number | null
          tax_inclusive: boolean | null
          tax_rate: number | null
          terms: string | null
          title: string | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conversion_method?: string | null
          conversion_notes?: string | null
          conversion_type?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_url?: string | null
          final_file_url?: string | null
          id?: string
          lead_id?: string | null
          linked_quote_request_id?: string | null
          notes?: string | null
          origin_type?: string | null
          quote_number: string
          sent_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_quote_uploaded_at?: string | null
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          terms?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conversion_method?: string | null
          conversion_notes?: string | null
          conversion_type?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          file_url?: string | null
          final_file_url?: string | null
          id?: string
          lead_id?: string | null
          linked_quote_request_id?: string | null
          notes?: string | null
          origin_type?: string | null
          quote_number?: string
          sent_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_quote_uploaded_at?: string | null
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          terms?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_linked_quote_request_id_fkey"
            columns: ["linked_quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          identifier: string
          last_attempt: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier: string
          last_attempt?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier?: string
          last_attempt?: string
          window_start?: string
        }
        Relationships: []
      }
      rfqs: {
        Row: {
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          quote_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          quote_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          quote_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alert_rules: {
        Row: {
          created_at: string
          description: string | null
          event_pattern: string
          id: string
          is_active: boolean
          name: string
          notification_channels: Json | null
          severity_threshold: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_pattern: string
          id?: string
          is_active?: boolean
          name: string
          notification_channels?: Json | null
          severity_threshold?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_pattern?: string
          id?: string
          is_active?: boolean
          name?: string
          notification_channels?: Json | null
          severity_threshold?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supplier_product_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_cost_price: number | null
          new_price: number
          old_cost_price: number | null
          old_price: number | null
          product_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_cost_price?: number | null
          new_price: number
          old_cost_price?: number | null
          old_price?: number | null
          product_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_cost_price?: number | null
          new_price?: number
          old_cost_price?: number | null
          old_price?: number | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          brand: string | null
          category: string
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_public_url: string | null
          is_active: boolean
          last_price_update: string | null
          name: string
          price_currency: string | null
          price_unit: string | null
          price_updated_by: string | null
          remote_image_url: string | null
          slug: string
          source_url: string | null
          supplier: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_public_url?: string | null
          is_active?: boolean
          last_price_update?: string | null
          name: string
          price_currency?: string | null
          price_unit?: string | null
          price_updated_by?: string | null
          remote_image_url?: string | null
          slug: string
          source_url?: string | null
          supplier: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_public_url?: string | null
          is_active?: boolean
          last_price_update?: string | null
          name?: string
          price_currency?: string | null
          price_unit?: string | null
          price_updated_by?: string | null
          remote_image_url?: string | null
          slug?: string
          source_url?: string | null
          supplier?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          message: string
          severity: string
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          message: string
          severity?: string
          source: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          message?: string
          severity?: string
          source?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          entity_type: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          entity_type: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tracking_access_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          success: boolean
          token_accessed: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: unknown
          success?: boolean
          token_accessed?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          token_accessed?: string | null
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          expires_at: string
          id: string
          last_used: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          expires_at?: string
          id?: string
          last_used?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string
          id?: string
          last_used?: string
          user_id?: string
        }
        Relationships: []
      }
      user_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_data_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          export_type: string
          file_url: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          export_type: string
          file_url?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          export_type?: string
          file_url?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          metadata: Json | null
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          city: string | null
          country_name: string | null
          created_at: string
          id: string
          ip_address: unknown
          is_suspicious: boolean | null
          login_time: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address: unknown
          is_suspicious?: boolean | null
          login_time?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean | null
          login_time?: string
          user_id?: string
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          location_data: Json | null
          login_time: string
          risk_score: number | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          login_time?: string
          risk_score?: number | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          location_data?: Json | null
          login_time?: string
          risk_score?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          enabled: boolean
          id: string
          secret_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          date_format: string
          high_contrast: boolean
          id: string
          language: string
          reduce_motion: boolean
          theme: string
          time_format: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_format?: string
          high_contrast?: boolean
          id?: string
          language?: string
          reduce_motion?: boolean
          theme?: string
          time_format?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_format?: string
          high_contrast?: boolean
          id?: string
          language?: string
          reduce_motion?: boolean
          theme?: string
          time_format?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      virtual_assistant_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          mode: Database["public"]["Enums"]["assistant_mode"]
          responsibility_id: string | null
          responsibility_name: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          mode: Database["public"]["Enums"]["assistant_mode"]
          responsibility_id?: string | null
          responsibility_name: string
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["assistant_mode"]
          responsibility_id?: string | null
          responsibility_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_assistant_logs_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "virtual_assistant_responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_assistant_reports: {
        Row: {
          data: Json | null
          generated_at: string
          id: string
          mode: Database["public"]["Enums"]["assistant_mode"]
          report_type: string
          summary: string | null
        }
        Insert: {
          data?: Json | null
          generated_at?: string
          id?: string
          mode: Database["public"]["Enums"]["assistant_mode"]
          report_type: string
          summary?: string | null
        }
        Update: {
          data?: Json | null
          generated_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["assistant_mode"]
          report_type?: string
          summary?: string | null
        }
        Relationships: []
      }
      virtual_assistant_responsibilities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          mode: Database["public"]["Enums"]["assistant_mode"]
          name: string
          status: Database["public"]["Enums"]["responsibility_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          mode: Database["public"]["Enums"]["assistant_mode"]
          name: string
          status?: Database["public"]["Enums"]["responsibility_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          mode?: Database["public"]["Enums"]["assistant_mode"]
          name?: string
          status?: Database["public"]["Enums"]["responsibility_status"]
          updated_at?: string
        }
        Relationships: []
      }
      virtual_assistant_settings: {
        Row: {
          created_at: string
          current_mode: Database["public"]["Enums"]["assistant_mode"]
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_mode?: Database["public"]["Enums"]["assistant_mode"]
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_mode?: Database["public"]["Enums"]["assistant_mode"]
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_communication_rate_limit: {
        Args: { p_ip_address: unknown }
        Returns: boolean
      }
      check_lead_rate_limit: {
        Args: { p_ip_address: unknown }
        Returns: boolean
      }
      check_newsletter_rate_limit: {
        Args: { p_ip_address: unknown }
        Returns: boolean
      }
      check_user_invitation_status: { Args: { p_email: string }; Returns: Json }
      check_user_role: {
        Args: { check_user_id: string; required_role: string }
        Returns: boolean
      }
      cleanup_expired_devices: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_tracking_logs: { Args: never; Returns: number }
      count_recent_failed_logins: {
        Args: { p_identifier: string; p_minutes?: number }
        Returns: number
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_changes?: Json
          p_event_data?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type?: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      create_customer_for_quote: {
        Args: {
          p_company_name: string
          p_contact_name: string
          p_country: string
          p_email: string
          p_industry?: string
          p_notes?: string
        }
        Returns: string
      }
      create_lead_for_quote: {
        Args: {
          p_customer_id: string
          p_description: string
          p_lead_score?: number
          p_source?: string
          p_title: string
        }
        Returns: string
      }
      detect_suspicious_activity: {
        Args: { p_time_window?: number; p_user_id: string }
        Returns: {
          occurrences: number
          pattern_type: string
          risk_level: string
        }[]
      }
      enhanced_audit_log: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_risk_level?: string
          p_table_name?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      force_order_status_change: {
        Args: {
          p_admin_id: string
          p_new_status: string
          p_order_id: string
          p_reason: string
        }
        Returns: Json
      }
      generate_invoice_number: {
        Args: { invoice_type: string }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      generate_quote_request_number: { Args: never; Returns: string }
      generate_secure_token: { Args: never; Returns: string }
      generate_tracking_token_for_order: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_anomaly_statistics: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          anomalous_logins: number
          average_risk_score: number
          blocked_attempts: number
          total_logins: number
        }[]
      }
      get_audit_summary: {
        Args: { p_days?: number; p_user_id?: string }
        Returns: {
          count: number
          event_type: string
          last_occurrence: string
        }[]
      }
      get_customer_communication_threads: {
        Args: { customer_uuid: string }
        Returns: {
          communication_date: string
          communication_type: Database["public"]["Enums"]["communication_type"]
          contact_person: string
          content: string
          created_at: string
          direction: string
          id: string
          parent_communication_id: string
          reply_count: number
          subject: string
          thread_id: string
          thread_position: number
        }[]
      }
      get_order_by_tracking_token: {
        Args: { p_token: string }
        Returns: {
          actual_delivery_date: string
          carrier: string
          created_at: string
          customer_name: string
          delivered_at: string
          delivery_address: string
          delivery_notes: string
          delivery_window: string
          estimated_delivery_date: string
          order_id: string
          order_number: string
          shipped_at: string
          status: string
          tracking_number: string
        }[]
      }
      get_password_policy: { Args: never; Returns: Json }
      get_user_role: { Args: { user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_allowed_admin_email: { Args: { user_email: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean }
      link_quote_to_request: {
        Args: { p_quote_id: string; p_quote_number: string }
        Returns: Json
      }
      log_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_severity?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      mark_magic_link_token_used: {
        Args: { p_token: string }
        Returns: boolean
      }
      merge_duplicate_customers: {
        Args: { keep_id: string; remove_id: string }
        Returns: undefined
      }
      user_can_access_customer: {
        Args: { p_customer_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_file_upload: {
        Args: {
          p_file_size: number
          p_filename: string
          p_mime_type: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_magic_link_token: {
        Args: { p_token: string }
        Returns: {
          is_valid: boolean
          order_id: string
          quote_id: string
          rfq_id: string
          supplier_email: string
          token_type: string
        }[]
      }
      validate_session: { Args: { p_session_token: string }; Returns: boolean }
      verify_newsletter_subscription: {
        Args: { p_token: string }
        Returns: Json
      }
    }
    Enums: {
      assistant_mode: "qa" | "workflow"
      communication_type: "email" | "phone" | "meeting" | "note"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      order_issue_status: "submitted" | "reviewing" | "resolved" | "rejected"
      order_issue_type:
        | "missing_items"
        | "damaged_items"
        | "wrong_items"
        | "late_delivery"
        | "quality_issue"
        | "other"
      order_status_enhanced:
        | "quote_pending"
        | "quote_sent"
        | "order_confirmed"
        | "payment_received"
        | "processing"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "delivery_failed"
      order_status_enum:
        | "quote_pending"
        | "quote_sent"
        | "order_confirmed"
        | "payment_received"
        | "processing"
        | "ready_to_ship"
        | "shipped"
        | "delivery_confirmation_pending"
        | "delivered"
        | "cancelled"
        | "delivery_failed"
        | "pending_payment"
        | "payment_rejected"
      order_status_new:
        | "quote_pending"
        | "quote_sent"
        | "order_confirmed"
        | "payment_received"
        | "processing"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "delivery_failed"
      responsibility_status:
        | "active"
        | "inactive"
        | "running"
        | "completed"
        | "failed"
      user_role: "admin" | "user" | "moderator" | "super_admin"
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
      assistant_mode: ["qa", "workflow"],
      communication_type: ["email", "phone", "meeting", "note"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      order_issue_status: ["submitted", "reviewing", "resolved", "rejected"],
      order_issue_type: [
        "missing_items",
        "damaged_items",
        "wrong_items",
        "late_delivery",
        "quality_issue",
        "other",
      ],
      order_status_enhanced: [
        "quote_pending",
        "quote_sent",
        "order_confirmed",
        "payment_received",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "delivery_failed",
      ],
      order_status_enum: [
        "quote_pending",
        "quote_sent",
        "order_confirmed",
        "payment_received",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivery_confirmation_pending",
        "delivered",
        "cancelled",
        "delivery_failed",
        "pending_payment",
        "payment_rejected",
      ],
      order_status_new: [
        "quote_pending",
        "quote_sent",
        "order_confirmed",
        "payment_received",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "delivery_failed",
      ],
      responsibility_status: [
        "active",
        "inactive",
        "running",
        "completed",
        "failed",
      ],
      user_role: ["admin", "user", "moderator", "super_admin"],
    },
  },
} as const
