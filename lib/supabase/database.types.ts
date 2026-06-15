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
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          employer_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          employer_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          employer_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_billing_settings: {
        Row: {
          accounts_email: string | null
          billing_contact_email: string
          billing_contact_name: string
          billing_contact_phone: string | null
          company_id: string
          created_at: string
          currency: string
          id: string
          payment_terms: string
          updated_at: string
        }
        Insert: {
          accounts_email?: string | null
          billing_contact_email: string
          billing_contact_name: string
          billing_contact_phone?: string | null
          company_id: string
          created_at?: string
          currency: string
          id?: string
          payment_terms: string
          updated_at?: string
        }
        Update: {
          accounts_email?: string | null
          billing_contact_email?: string
          billing_contact_name?: string
          billing_contact_phone?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_terms?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_billing_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_companies: {
        Row: {
          company_name: string
          country: string
          created_at: string
          created_by: string | null
          employee_count: number | null
          employer_id: string | null
          id: string
          industry: string
          onboarding_status: string
          registration_number: string
          registration_type: string | null
          review_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          trading_name: string | null
          updated_at: string
          website: string
        }
        Insert: {
          company_name: string
          country: string
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          employer_id?: string | null
          id?: string
          industry: string
          onboarding_status?: string
          registration_number: string
          registration_type?: string | null
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          trading_name?: string | null
          updated_at?: string
          website: string
        }
        Update: {
          company_name?: string
          country?: string
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          employer_id?: string | null
          id?: string
          industry?: string
          onboarding_status?: string
          registration_number?: string
          registration_type?: string | null
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          trading_name?: string | null
          updated_at?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_companies_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_companies_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_compliance_settings: {
        Row: {
          background_check_required: boolean
          company_id: string
          created_at: string
          equipment_required: boolean
          handles_customer_data: boolean
          id: string
          nda_required: boolean
          updated_at: string
        }
        Insert: {
          background_check_required?: boolean
          company_id: string
          created_at?: string
          equipment_required?: boolean
          handles_customer_data?: boolean
          id?: string
          nda_required?: boolean
          updated_at?: string
        }
        Update: {
          background_check_required?: boolean
          company_id?: string
          created_at?: string
          equipment_required?: boolean
          handles_customer_data?: boolean
          id?: string
          nda_required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_compliance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          company_id: string
          contact_type: string
          created_at: string
          designation: string | null
          email: string
          id: string
          name: string
          phone: string | null
          timezone: string | null
        }
        Insert: {
          company_id: string
          contact_type: string
          created_at?: string
          designation?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          timezone?: string | null
        }
        Update: {
          company_id?: string
          contact_type?: string
          created_at?: string
          designation?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          company_id: string
          document_type: string
          file_path: string
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          document_type: string
          file_path: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          document_type?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_employment_defaults: {
        Row: {
          company_id: string
          created_at: string
          id: string
          leave_policy: string
          notice_period: string
          probation_period: string
          updated_at: string
          work_mode: string
          working_hours: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          leave_policy: string
          notice_period: string
          probation_period: string
          updated_at?: string
          work_mode: string
          working_hours: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          leave_policy?: string
          notice_period?: string
          probation_period?: string
          updated_at?: string
          work_mode?: string
          working_hours?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_employment_defaults_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          company_id: string | null
          created_at: string
          file_path: string
          id: string
          is_active: boolean
          template_name: string
          template_type: string
          updated_at: string
          uploaded_by_role: string
          uploaded_by_user_id: string | null
          version_number: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_path: string
          id?: string
          is_active?: boolean
          template_name: string
          template_type: string
          updated_at?: string
          uploaded_by_role: string
          uploaded_by_user_id?: string | null
          version_number?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_path?: string
          id?: string
          is_active?: boolean
          template_name?: string
          template_type?: string
          updated_at?: string
          uploaded_by_role?: string
          uploaded_by_user_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          entity_id: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          entity_id: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          default_value: string | null
          field_key: string
          field_label: string
          field_type: string
          help_text: string | null
          id: string
          options: Json
          placeholder: string | null
          required: boolean
          target_type: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          field_key: string
          field_label: string
          field_type: string
          help_text?: string | null
          id?: string
          options?: Json
          placeholder?: string | null
          required?: boolean
          target_type: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          field_key?: string
          field_label?: string
          field_type?: string
          help_text?: string | null
          id?: string
          options?: Json
          placeholder?: string | null
          required?: boolean
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "client_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_fields_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_absences: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          end_date: string
          excluded_holiday_days: number
          id: string
          is_lop: boolean
          leave_request_id: string | null
          marked_by: string | null
          mobile_number: string | null
          reason: string | null
          start_date: string
          status: string
          team_id: string | null
          total_absent_days: number
          total_selected_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          end_date: string
          excluded_holiday_days?: number
          id?: string
          is_lop?: boolean
          leave_request_id?: string | null
          marked_by?: string | null
          mobile_number?: string | null
          reason?: string | null
          start_date: string
          status?: string
          team_id?: string | null
          total_absent_days: number
          total_selected_days: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          end_date?: string
          excluded_holiday_days?: number
          id?: string
          is_lop?: boolean
          leave_request_id?: string | null
          marked_by?: string | null
          mobile_number?: string | null
          reason?: string | null
          start_date?: string
          status?: string
          team_id?: string | null
          total_absent_days?: number
          total_selected_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_addresses: {
        Row: {
          city: string
          current_address: string
          employee_id: string
          id: string
          permanent_address: string
          postal_code: string
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          current_address: string
          employee_id: string
          id?: string
          permanent_address: string
          postal_code: string
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          current_address?: string
          employee_id?: string
          id?: string
          permanent_address?: string
          postal_code?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_bank_details: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          employee_id: string
          id: string
          ifsc_code: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          employee_id: string
          id?: string
          ifsc_code: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          employee_id?: string
          id?: string
          ifsc_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compensation: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          employee_id: string
          id: string
          monthly_salary: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from: string
          employee_id: string
          id?: string
          monthly_salary: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          employee_id?: string
          id?: string
          monthly_salary?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          document_type: string
          employee_id: string
          file_path: string
          id: string
          remarks: string | null
          replaced_by_document_id: string | null
          uploaded_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          employee_id: string
          file_path: string
          id?: string
          remarks?: string | null
          replaced_by_document_id?: string | null
          uploaded_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          employee_id?: string
          file_path?: string
          id?: string
          remarks?: string | null
          replaced_by_document_id?: string | null
          uploaded_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_replaced_by_document_id_fkey"
            columns: ["replaced_by_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_education: {
        Row: {
          employee_id: string
          id: string
          institution: string
          qualification: string
          updated_at: string
          year_of_passing: number
        }
        Insert: {
          employee_id: string
          id?: string
          institution: string
          qualification: string
          updated_at?: string
          year_of_passing: number
        }
        Update: {
          employee_id?: string
          id?: string
          institution?: string
          qualification?: string
          updated_at?: string
          year_of_passing?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_emergency_contacts: {
        Row: {
          contact_name: string
          employee_id: string
          id: string
          phone: string
          relationship: string
          updated_at: string
        }
        Insert: {
          contact_name: string
          employee_id: string
          id?: string
          phone: string
          relationship: string
          updated_at?: string
        }
        Update: {
          contact_name?: string
          employee_id?: string
          id?: string
          phone?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_emergency_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_experience: {
        Row: {
          employee_id: string
          id: string
          is_fresher: boolean
          previous_company: string | null
          previous_designation: string | null
          total_experience: string | null
          updated_at: string
        }
        Insert: {
          employee_id: string
          id?: string
          is_fresher?: boolean
          previous_company?: string | null
          previous_designation?: string | null
          total_experience?: string | null
          updated_at?: string
        }
        Update: {
          employee_id?: string
          id?: string
          is_fresher?: boolean
          previous_company?: string | null
          previous_designation?: string | null
          total_experience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_experience_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_identity_details: {
        Row: {
          aadhaar_number: string
          employee_id: string
          id: string
          pan_number: string
          passport_number: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_number: string
          employee_id: string
          id?: string
          pan_number: string
          passport_number?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_number?: string
          employee_id?: string
          id?: string
          pan_number?: string
          passport_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_identity_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_progress: {
        Row: {
          completed_steps: Json | null
          completion_percentage: number
          current_step: string
          employee_id: string
          id: string
          last_updated: string
        }
        Insert: {
          completed_steps?: Json | null
          completion_percentage?: number
          current_step?: string
          employee_id: string
          id?: string
          last_updated?: string
        }
        Update: {
          completed_steps?: Json | null
          completion_percentage?: number
          current_step?: string
          employee_id?: string
          id?: string
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_status: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_status_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_status_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          alternate_phone: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          employee_code: string | null
          employee_id: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alternate_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          employee_code?: string | null
          employee_id?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alternate_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          employee_code?: string | null
          employee_id?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          admin_notes: string | null
          billing_currency: string
          calculated_annual_salary: number | null
          calculated_monthly_salary: number | null
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          employer_id: string
          full_name: string
          hourly_billing_rate: number | null
          hours_per_week: number
          id: string
          invite_accepted_at: string | null
          invite_error: string | null
          invite_id: string | null
          invite_sent_at: string | null
          job_title: string | null
          onboarding_notes: string | null
          onboarding_started_at: string | null
          proposed_start_date: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          weeks_per_year: number
        }
        Insert: {
          admin_notes?: string | null
          billing_currency?: string
          calculated_annual_salary?: number | null
          calculated_monthly_salary?: number | null
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          employer_id: string
          full_name: string
          hourly_billing_rate?: number | null
          hours_per_week?: number
          id?: string
          invite_accepted_at?: string | null
          invite_error?: string | null
          invite_id?: string | null
          invite_sent_at?: string | null
          job_title?: string | null
          onboarding_notes?: string | null
          onboarding_started_at?: string | null
          proposed_start_date?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          weeks_per_year?: number
        }
        Update: {
          admin_notes?: string | null
          billing_currency?: string
          calculated_annual_salary?: number | null
          calculated_monthly_salary?: number | null
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          employer_id?: string
          full_name?: string
          hourly_billing_rate?: number | null
          hours_per_week?: number
          id?: string
          invite_accepted_at?: string | null
          invite_error?: string | null
          invite_id?: string | null
          invite_sent_at?: string | null
          job_title?: string | null
          onboarding_notes?: string | null
          onboarding_started_at?: string | null
          proposed_start_date?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          weeks_per_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          email: string
          employer_id: string
          employer_setup_completed_at: string | null
          employer_setup_completed_by: string | null
          employer_setup_notes: string | null
          full_name: string
          id: string
          job_title: string | null
          leave_policy_id: string | null
          lifecycle_status: string
          manager_employee_id: string | null
          notice_period_days: number | null
          portal_user_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["account_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          employer_id: string
          employer_setup_completed_at?: string | null
          employer_setup_completed_by?: string | null
          employer_setup_notes?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          leave_policy_id?: string | null
          lifecycle_status?: string
          manager_employee_id?: string | null
          notice_period_days?: number | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          employer_id?: string
          employer_setup_completed_at?: string | null
          employer_setup_completed_by?: string | null
          employer_setup_notes?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          leave_policy_id?: string | null
          lifecycle_status?: string
          manager_employee_id?: string | null
          notice_period_days?: number | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_employer_setup_completed_by_fkey"
            columns: ["employer_setup_completed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_leave_policy_id_fkey"
            columns: ["leave_policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: true
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_billing: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          employee_id: string
          employer_id: string
          id: string
          monthly_bill_amount: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from: string
          employee_id: string
          employer_id: string
          id?: string
          monthly_bill_amount: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          employee_id?: string
          employer_id?: string
          id?: string
          monthly_bill_amount?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_billing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_billing_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_billing_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_leads: {
        Row: {
          company_name: string | null
          contact_name: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          portal_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          portal_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          portal_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_leads_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_leads_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          id: string
          legal_name: string | null
          name: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_company_mappings: {
        Row: {
          created_at: string
          employer_id: string | null
          external_company_id: string
          external_company_name: string
          id: string
          source_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_id?: string | null
          external_company_id: string
          external_company_name: string
          id?: string
          source_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_id?: string | null
          external_company_id?: string
          external_company_name?: string
          id?: string
          source_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_company_mappings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_company_mappings_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_employee_mappings: {
        Row: {
          created_at: string
          employee_id: string | null
          employer_id: string | null
          external_company_id: string
          external_employee_email: string | null
          external_employee_id: string
          external_employee_name: string
          id: string
          source_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          external_company_id: string
          external_employee_email?: string | null
          external_employee_id: string
          external_employee_name: string
          id?: string
          source_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          external_company_id?: string
          external_employee_email?: string | null
          external_employee_id?: string
          external_employee_name?: string
          id?: string
          source_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_employee_mappings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_mappings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_mappings_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_employee_salary_payments: {
        Row: {
          actual_paid_inr_cents: number
          created_at: string
          employee_id: string | null
          employer_id: string | null
          external_company_id: string
          external_employee_id: string
          external_salary_payment_id: string
          id: string
          month_key: string
          notes: string | null
          paid_date: string | null
          paid_status: boolean
          paid_usd_inr_rate: number
          pf_inr_cents: number
          salary_paid_inr_cents: number
          salary_usd_cents: number
          source_key: string
          sync_status: string
          tds_inr_cents: number
          updated_at: string
        }
        Insert: {
          actual_paid_inr_cents?: number
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          external_company_id: string
          external_employee_id: string
          external_salary_payment_id: string
          id?: string
          month_key: string
          notes?: string | null
          paid_date?: string | null
          paid_status?: boolean
          paid_usd_inr_rate?: number
          pf_inr_cents?: number
          salary_paid_inr_cents?: number
          salary_usd_cents?: number
          source_key?: string
          sync_status?: string
          tds_inr_cents?: number
          updated_at?: string
        }
        Update: {
          actual_paid_inr_cents?: number
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          external_company_id?: string
          external_employee_id?: string
          external_salary_payment_id?: string
          id?: string
          month_key?: string
          notes?: string | null
          paid_date?: string | null
          paid_status?: boolean
          paid_usd_inr_rate?: number
          pf_inr_cents?: number
          salary_paid_inr_cents?: number
          salary_usd_cents?: number
          source_key?: string
          sync_status?: string
          tds_inr_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_employee_salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_salary_payments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_salary_payments_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_employee_statement_rows: {
        Row: {
          appraisal_advance_usd_cents: number
          created_at: string
          dollar_inward_usd_cents: number
          employee_id: string | null
          employee_name_snapshot: string
          external_employee_id: string
          external_invoice_id: string
          external_statement_row_id: string
          id: string
          invoice_id: string | null
          invoice_number_snapshot: string
          month_key: string
          offboarding_deduction_usd_cents: number
          onboarding_advance_usd_cents: number
          reimbursement_labels_text: string
          reimbursement_usd_cents: number
          source_key: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          appraisal_advance_usd_cents?: number
          created_at?: string
          dollar_inward_usd_cents?: number
          employee_id?: string | null
          employee_name_snapshot: string
          external_employee_id: string
          external_invoice_id: string
          external_statement_row_id: string
          id?: string
          invoice_id?: string | null
          invoice_number_snapshot: string
          month_key: string
          offboarding_deduction_usd_cents?: number
          onboarding_advance_usd_cents?: number
          reimbursement_labels_text?: string
          reimbursement_usd_cents?: number
          source_key?: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          appraisal_advance_usd_cents?: number
          created_at?: string
          dollar_inward_usd_cents?: number
          employee_id?: string | null
          employee_name_snapshot?: string
          external_employee_id?: string
          external_invoice_id?: string
          external_statement_row_id?: string
          id?: string
          invoice_id?: string | null
          invoice_number_snapshot?: string
          month_key?: string
          offboarding_deduction_usd_cents?: number
          onboarding_advance_usd_cents?: number
          reimbursement_labels_text?: string
          reimbursement_usd_cents?: number
          source_key?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_employee_statement_rows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_statement_rows_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_statement_rows_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_employee_statement_summaries: {
        Row: {
          created_at: string
          effective_dollar_inward_usd_cents: number
          employee_id: string | null
          external_employee_id: string
          external_statement_summary_id: string
          id: string
          month_key: string
          month_label_snapshot: string
          monthly_dollar_paid_usd_cents: number
          source_key: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_dollar_inward_usd_cents?: number
          employee_id?: string | null
          external_employee_id: string
          external_statement_summary_id: string
          id?: string
          month_key: string
          month_label_snapshot: string
          monthly_dollar_paid_usd_cents?: number
          source_key?: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_dollar_inward_usd_cents?: number
          employee_id?: string | null
          external_employee_id?: string
          external_statement_summary_id?: string
          id?: string
          month_key?: string
          month_label_snapshot?: string
          monthly_dollar_paid_usd_cents?: number
          source_key?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_employee_statement_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employee_statement_summaries_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_invoice_line_items: {
        Row: {
          billed_total_usd_cents: number
          billing_rate_usd_cents: number
          created_at: string
          days_worked: number | null
          designation_snapshot: string | null
          employee_id: string | null
          employee_name_snapshot: string
          employer_id: string | null
          external_employee_id: string
          external_invoice_id: string
          external_line_item_id: string
          hrs_per_week: number | null
          id: string
          invoice_id: string
          payout_monthly_usd_cents_snapshot: number
          payout_total_usd_cents: number
          profit_total_usd_cents: number
          source_key: string
          sync_status: string
          team_name_snapshot: string | null
          updated_at: string
        }
        Insert: {
          billed_total_usd_cents?: number
          billing_rate_usd_cents?: number
          created_at?: string
          days_worked?: number | null
          designation_snapshot?: string | null
          employee_id?: string | null
          employee_name_snapshot: string
          employer_id?: string | null
          external_employee_id: string
          external_invoice_id: string
          external_line_item_id: string
          hrs_per_week?: number | null
          id?: string
          invoice_id: string
          payout_monthly_usd_cents_snapshot?: number
          payout_total_usd_cents?: number
          profit_total_usd_cents?: number
          source_key?: string
          sync_status?: string
          team_name_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          billed_total_usd_cents?: number
          billing_rate_usd_cents?: number
          created_at?: string
          days_worked?: number | null
          designation_snapshot?: string | null
          employee_id?: string | null
          employee_name_snapshot?: string
          employer_id?: string | null
          external_employee_id?: string
          external_invoice_id?: string
          external_line_item_id?: string
          hrs_per_week?: number | null
          id?: string
          invoice_id?: string
          payout_monthly_usd_cents_snapshot?: number
          payout_total_usd_cents?: number
          profit_total_usd_cents?: number
          source_key?: string
          sync_status?: string
          team_name_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_line_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_line_items_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_line_items_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_invoice_payments: {
        Row: {
          created_at: string
          employer_id: string | null
          external_company_id: string
          external_invoice_id: string
          external_payment_id: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string | null
          payment_month: string
          source_key: string
          updated_at: string
          usd_inr_rate: number
        }
        Insert: {
          created_at?: string
          employer_id?: string | null
          external_company_id: string
          external_invoice_id: string
          external_payment_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string | null
          payment_month: string
          source_key?: string
          updated_at?: string
          usd_inr_rate?: number
        }
        Update: {
          created_at?: string
          employer_id?: string | null
          external_company_id?: string
          external_invoice_id?: string
          external_payment_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string | null
          payment_month?: string
          source_key?: string
          updated_at?: string
          usd_inr_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_payments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoice_payments_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          adjustments_usd_cents: number
          billing_date: string | null
          created_at: string
          due_date: string | null
          employer_id: string | null
          external_company_id: string
          external_invoice_id: string
          grand_total_usd_cents: number
          id: string
          invoice_number: string
          last_source_status: string | null
          last_status_synced_at: string | null
          month: number
          month_key: string
          note_text: string | null
          payment_received_at: string | null
          payment_received_by: string | null
          payment_received_notes: string | null
          pdf_path: string | null
          source_key: string
          status: string
          subtotal_usd_cents: number
          sync_status: string
          synced_at: string
          updated_at: string
          year: number
        }
        Insert: {
          adjustments_usd_cents?: number
          billing_date?: string | null
          created_at?: string
          due_date?: string | null
          employer_id?: string | null
          external_company_id: string
          external_invoice_id: string
          grand_total_usd_cents?: number
          id?: string
          invoice_number: string
          last_source_status?: string | null
          last_status_synced_at?: string | null
          month: number
          month_key: string
          note_text?: string | null
          payment_received_at?: string | null
          payment_received_by?: string | null
          payment_received_notes?: string | null
          pdf_path?: string | null
          source_key?: string
          status: string
          subtotal_usd_cents?: number
          sync_status?: string
          synced_at?: string
          updated_at?: string
          year: number
        }
        Update: {
          adjustments_usd_cents?: number
          billing_date?: string | null
          created_at?: string
          due_date?: string | null
          employer_id?: string | null
          external_company_id?: string
          external_invoice_id?: string
          grand_total_usd_cents?: number
          id?: string
          invoice_number?: string
          last_source_status?: string | null
          last_status_synced_at?: string | null
          month?: number
          month_key?: string
          note_text?: string | null
          payment_received_at?: string | null
          payment_received_by?: string | null
          payment_received_notes?: string | null
          pdf_path?: string | null
          source_key?: string
          status?: string
          subtotal_usd_cents?: number
          sync_status?: string
          synced_at?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_payment_received_by_fkey"
            columns: ["payment_received_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_payroll_allocations: {
        Row: {
          allocated_usd_cents: number
          allocation_source: string
          cashout_rate: number | null
          cashout_rate_source: string
          created_at: string
          created_by: string | null
          employee_id: string
          employer_id: string
          id: string
          invoice_id: string | null
          invoice_month: string | null
          invoice_payment_id: string | null
          override_reason: string | null
          paid_month: string | null
          payroll_month: string | null
          salary_payment_id: string | null
          source_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocated_usd_cents?: number
          allocation_source?: string
          cashout_rate?: number | null
          cashout_rate_source?: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          employer_id: string
          id?: string
          invoice_id?: string | null
          invoice_month?: string | null
          invoice_payment_id?: string | null
          override_reason?: string | null
          paid_month?: string | null
          payroll_month?: string | null
          salary_payment_id?: string | null
          source_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocated_usd_cents?: number
          allocation_source?: string
          cashout_rate?: number | null
          cashout_rate_source?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employer_id?: string
          id?: string
          invoice_id?: string | null
          invoice_month?: string | null
          invoice_payment_id?: string | null
          override_reason?: string | null
          paid_month?: string | null
          payroll_month?: string | null
          salary_payment_id?: string | null
          source_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payroll_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_invoice_payment_id_fkey"
            columns: ["invoice_payment_id"]
            isOneToOne: false
            referencedRelation: "finance_invoice_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_salary_payment_id_fkey"
            columns: ["salary_payment_id"]
            isOneToOne: false
            referencedRelation: "finance_employee_salary_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
          {
            foreignKeyName: "finance_payroll_allocations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_sync_runs: {
        Row: {
          created_at: string
          external_invoice_id: string | null
          id: string
          result: Json
          source_key: string
          status: string
        }
        Insert: {
          created_at?: string
          external_invoice_id?: string | null
          id?: string
          result?: Json
          source_key?: string
          status: string
        }
        Update: {
          created_at?: string
          external_invoice_id?: string | null
          id?: string
          result?: Json
          source_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_sync_runs_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "finance_sync_sources"
            referencedColumns: ["source_key"]
          },
        ]
      }
      finance_sync_sources: {
        Row: {
          created_at: string
          display_name: string
          id: string
          source_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          source_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          source_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      holiday_calendar_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          effective_date: string
          employer_id: string
          id: string
          proposed_payload: Json
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          effective_date: string
          employer_id: string
          id?: string
          proposed_payload?: Json
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          effective_date?: string
          employer_id?: string
          id?: string
          proposed_payload?: Json
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_calendar_change_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_calendar_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_calendar_change_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date: string
          employer_id: string
          id: string
          name: string | null
          override_type: string
          reason: string | null
          source_request_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date: string
          employer_id: string
          id?: string
          name?: string | null
          override_type: string
          reason?: string | null
          source_request_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string
          employer_id?: string
          id?: string
          name?: string | null
          override_type?: string
          reason?: string | null
          source_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holiday_overrides_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_overrides_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_overrides_source_request_id_fkey"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "holiday_calendar_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          employer_id: string | null
          id: string
          is_weekly_off: boolean
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          employer_id?: string | null
          id?: string
          is_weekly_off?: boolean
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          employer_id?: string | null
          id?: string
          is_weekly_off?: boolean
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          adjusted_by: string | null
          adjustment_notes: string | null
          casual_available: number
          comp_off_available: number
          created_at: string
          earned_available: number
          employee_id: string
          id: string
          lop_days: number
          sick_available: number
          updated_at: string
          year: number
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_notes?: string | null
          casual_available?: number
          comp_off_available?: number
          created_at?: string
          earned_available?: number
          employee_id: string
          id?: string
          lop_days?: number
          sick_available?: number
          updated_at?: string
          year: number
        }
        Update: {
          adjusted_by?: string | null
          adjustment_notes?: string | null
          casual_available?: number
          comp_off_available?: number
          created_at?: string
          earned_available?: number
          employee_id?: string
          id?: string
          lop_days?: number
          sick_available?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          accrual_notes: string | null
          bereavement_leave_days: number
          carry_forward_allowed: boolean
          casual_leave: number
          comp_off_allowed: boolean
          created_at: string
          created_by: string | null
          earned_leave: number
          employer_id: string
          encashment_allowed: boolean
          half_day_allowed: boolean
          id: string
          lop_policy: string | null
          maternity_leave_days: number
          max_carry_forward: number
          notice_period_days: number
          paternity_leave_days: number
          probation_leave_allowed: boolean
          public_holidays: number
          sick_leave: number
          updated_at: string
          weekly_off: string | null
          year: number
        }
        Insert: {
          accrual_notes?: string | null
          bereavement_leave_days?: number
          carry_forward_allowed?: boolean
          casual_leave?: number
          comp_off_allowed?: boolean
          created_at?: string
          created_by?: string | null
          earned_leave?: number
          employer_id: string
          encashment_allowed?: boolean
          half_day_allowed?: boolean
          id?: string
          lop_policy?: string | null
          maternity_leave_days?: number
          max_carry_forward?: number
          notice_period_days?: number
          paternity_leave_days?: number
          probation_leave_allowed?: boolean
          public_holidays?: number
          sick_leave?: number
          updated_at?: string
          weekly_off?: string | null
          year: number
        }
        Update: {
          accrual_notes?: string | null
          bereavement_leave_days?: number
          carry_forward_allowed?: boolean
          casual_leave?: number
          comp_off_allowed?: boolean
          created_at?: string
          created_by?: string | null
          earned_leave?: number
          employer_id?: string
          encashment_allowed?: boolean
          half_day_allowed?: boolean
          id?: string
          lop_policy?: string | null
          maternity_leave_days?: number
          max_carry_forward?: number
          notice_period_days?: number
          paternity_leave_days?: number
          probation_leave_allowed?: boolean
          public_holidays?: number
          sick_leave?: number
          updated_at?: string
          weekly_off?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_policies_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request_days: {
        Row: {
          absence_id: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          is_holiday: boolean
          is_lop: boolean
          leave_request_id: string
          status: Database["public"]["Enums"]["leave_request_status"]
        }
        Insert: {
          absence_id?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          is_holiday?: boolean
          is_lop?: boolean
          leave_request_id: string
          status?: Database["public"]["Enums"]["leave_request_status"]
        }
        Update: {
          absence_id?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          is_holiday?: boolean
          is_lop?: boolean
          leave_request_id?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_days_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_days_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          created_for_employee_by: string | null
          days: number
          employee_id: string
          employer_id: string
          end_date: string
          excluded_holiday_days: number
          id: string
          leave_type: string
          lop_days: number
          mobile_number: string | null
          paid_leave_days: number
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          team_id: string | null
          total_leave_days: number | null
          total_selected_days: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          created_for_employee_by?: string | null
          days: number
          employee_id: string
          employer_id: string
          end_date: string
          excluded_holiday_days?: number
          id?: string
          leave_type: string
          lop_days?: number
          mobile_number?: string | null
          paid_leave_days?: number
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          team_id?: string | null
          total_leave_days?: number | null
          total_selected_days?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          created_for_employee_by?: string | null
          days?: number
          employee_id?: string
          employer_id?: string
          end_date?: string
          excluded_holiday_days?: number
          id?: string
          leave_type?: string
          lop_days?: number
          mobile_number?: string | null
          paid_leave_days?: number
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          team_id?: string | null
          total_leave_days?: number | null
          total_selected_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_created_for_employee_by_fkey"
            columns: ["created_for_employee_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      message_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_entries_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_entries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_participants: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          last_read_at: string | null
          portal_user_id: string
          role_snapshot: string
          thread_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_read_at?: string | null
          portal_user_id: string
          role_snapshot: string
          thread_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_read_at?: string | null
          portal_user_id?: string
          role_snapshot?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_participants_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          created_by: string | null
          employer_id: string | null
          id: string
          related_employee_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employer_id?: string | null
          id?: string
          related_employee_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employer_id?: string | null
          id?: string
          related_employee_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_recipients: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          notice_id: string
          read_at: string | null
          recipient_user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          notice_id: string
          read_at?: string | null
          recipient_user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          notice_id?: string
          read_at?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_recipients_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_recipients_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string
          category: string | null
          created_at: string
          employer_id: string | null
          id: string
          priority: Database["public"]["Enums"]["notice_priority"]
          requires_acknowledgement: boolean
          sender_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body: string
          category?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["notice_priority"]
          requires_acknowledgement?: boolean
          sender_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string
          category?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["notice_priority"]
          requires_acknowledgement?: boolean
          sender_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_cases: {
        Row: {
          access_deactivation_confirmed_at: string | null
          access_deactivation_confirmed_by: string | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string
          employer_id: string
          employer_notes: string | null
          id: string
          initiated_at: string | null
          rejection_reason: string | null
          requested_by: string | null
          resignation_id: string | null
          status: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day: string | null
          updated_at: string
        }
        Insert: {
          access_deactivation_confirmed_at?: string | null
          access_deactivation_confirmed_by?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id: string
          employer_id: string
          employer_notes?: string | null
          id?: string
          initiated_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          resignation_id?: string | null
          status?: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day?: string | null
          updated_at?: string
        }
        Update: {
          access_deactivation_confirmed_at?: string | null
          access_deactivation_confirmed_by?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string
          employer_id?: string
          employer_notes?: string | null
          id?: string
          initiated_at?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          resignation_id?: string | null
          status?: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_cases_access_deactivation_confirmed_by_fkey"
            columns: ["access_deactivation_confirmed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offboarding_cases_resignation_id_fkey"
            columns: ["resignation_id"]
            isOneToOne: false
            referencedRelation: "resignations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_employee_payroll_line_items: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          note: string | null
          payroll_record_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          note?: string | null
          payroll_record_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          note?: string | null
          payroll_record_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_employee_payroll_line_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employee_payroll_line_items_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "portal_employee_payroll_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employee_payroll_line_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_employee_payroll_records: {
        Row: {
          actual_paid_inr: number
          created_at: string
          created_by: string | null
          employee_id: string
          employer_id: string
          gross_salary_inr: number
          id: string
          payment_date: string | null
          payment_status: string
          payroll_month: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_paid_inr?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          employer_id: string
          gross_salary_inr?: number
          id?: string
          payment_date?: string | null
          payment_status?: string
          payroll_month: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_paid_inr?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employer_id?: string
          gross_salary_inr?: number
          id?: string
          payment_date?: string | null
          payment_status?: string
          payroll_month?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_employee_payroll_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employee_payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employee_payroll_records_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employee_payroll_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_employer_invoice_line_items: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          id: string
          invoice_record_id: string
          label: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_record_id: string
          label: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_record_id?: string
          label?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_employer_invoice_line_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employer_invoice_line_items_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "portal_employer_invoice_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employer_invoice_line_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_employer_invoice_records: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          days_worked: number | null
          employee_id: string
          employer_id: string
          hourly_rate: number
          hours_per_week: number
          id: string
          invoice_month: string
          invoice_no: string | null
          monthly_bill: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          days_worked?: number | null
          employee_id: string
          employer_id: string
          hourly_rate?: number
          hours_per_week?: number
          id?: string
          invoice_month: string
          invoice_no?: string | null
          monthly_bill?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          days_worked?: number | null
          employee_id?: string
          employer_id?: string
          hourly_rate?: number
          hours_per_week?: number
          id?: string
          invoice_month?: string
          invoice_no?: string | null
          monthly_bill?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_employer_invoice_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employer_invoice_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employer_invoice_records_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_employer_invoice_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_payslip_files: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          payroll_month: string
          payroll_record_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          payroll_month: string
          payroll_record_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          payroll_month?: string
          payroll_record_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_payslip_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_payslip_files_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_payslip_files_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: true
            referencedRelation: "portal_employee_payroll_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_payslip_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          clerk_user_id: string
          created_at: string
          email: string
          employer_id: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          notification_preferences: Json | null
          role: Database["public"]["Enums"]["portal_role"]
          status: Database["public"]["Enums"]["account_status"]
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          email: string
          employer_id?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          notification_preferences?: Json | null
          role: Database["public"]["Enums"]["portal_role"]
          status?: Database["public"]["Enums"]["account_status"]
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          email?: string
          employer_id?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          notification_preferences?: Json | null
          role?: Database["public"]["Enums"]["portal_role"]
          status?: Database["public"]["Enums"]["account_status"]
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          payload: Json
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          payload?: Json
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          payload?: Json
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      resignations: {
        Row: {
          accepted_notice_sent_at: string | null
          acknowledged_at: string | null
          admin_notes: string | null
          calculated_last_working_day: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          employee_id: string
          employer_id: string
          employer_notes: string | null
          forwarded_at: string | null
          id: string
          notice_period_days: number | null
          preferred_last_working_day: string | null
          reason: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["resignation_status"]
          updated_at: string
        }
        Insert: {
          accepted_notice_sent_at?: string | null
          acknowledged_at?: string | null
          admin_notes?: string | null
          calculated_last_working_day?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id: string
          employer_id: string
          employer_notes?: string | null
          forwarded_at?: string | null
          id?: string
          notice_period_days?: number | null
          preferred_last_working_day?: string | null
          reason?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["resignation_status"]
          updated_at?: string
        }
        Update: {
          accepted_notice_sent_at?: string | null
          acknowledged_at?: string | null
          admin_notes?: string | null
          calculated_last_working_day?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id?: string
          employer_id?: string
          employer_notes?: string | null
          forwarded_at?: string | null
          id?: string
          notice_period_days?: number | null
          preferred_last_working_day?: string | null
          reason?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["resignation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resignations_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resignations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resignations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          admin_notes: string | null
          created_at: string
          currency: string | null
          employee_id: string | null
          employer_id: string
          employer_notes: string | null
          file_path: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          shared_with_employee: boolean
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          currency?: string | null
          employee_id?: string | null
          employer_id: string
          employer_notes?: string | null
          file_path: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shared_with_employee?: boolean
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          currency?: string | null
          employee_id?: string | null
          employer_id?: string
          employer_notes?: string | null
          file_path?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shared_with_employee?: boolean
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          role_in_team: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          role_in_team?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          role_in_team?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          manager_employee_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          manager_employee_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          manager_employee_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_off_rules: {
        Row: {
          active: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          effective_from: string
          employer_id: string
          id: string
          is_weekly_off: boolean
          source_request_id: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_from: string
          employer_id: string
          id?: string
          is_weekly_off?: boolean
          source_request_id?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          effective_from?: string
          employer_id?: string
          id?: string
          is_weekly_off?: boolean
          source_request_id?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_off_rules_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_off_rules_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_off_rules_source_request_fk"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "holiday_calendar_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_update_employee_team_assignments: {
        Args: {
          p_assignments: Json
          p_employer_id: string
        }
        Returns: {
          updated_count: number
        }[]
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "deactivated"
      leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
      notice_priority: "normal" | "important" | "urgent"
      offboarding_status:
        | "requested_by_employer"
        | "requested_after_resignation"
        | "admin_approved"
        | "admin_rejected"
        | "employee_notified"
        | "in_progress"
        | "completed"
        | "cancelled"
      portal_role: "super_admin" | "admin" | "employer_admin" | "employee"
      resignation_status:
        | "submitted_to_admin"
        | "forwarded_to_employer"
        | "employer_acknowledged"
        | "offboarding_requested"
        | "admin_approved_offboarding"
        | "offboarding_in_progress"
        | "completed"
        | "cancelled"
      review_status:
        | "pending"
        | "approved"
        | "rejected"
        | "invite_sent"
        | "joined"
        | "completed"
        | "cancelled"
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
      account_status: ["pending", "active", "suspended", "deactivated"],
      leave_request_status: ["pending", "approved", "rejected", "cancelled"],
      notice_priority: ["normal", "important", "urgent"],
      offboarding_status: [
        "requested_by_employer",
        "requested_after_resignation",
        "admin_approved",
        "admin_rejected",
        "employee_notified",
        "in_progress",
        "completed",
        "cancelled",
      ],
      portal_role: ["super_admin", "admin", "employer_admin", "employee"],
      resignation_status: [
        "submitted_to_admin",
        "forwarded_to_employer",
        "employer_acknowledged",
        "offboarding_requested",
        "admin_approved_offboarding",
        "offboarding_in_progress",
        "completed",
        "cancelled",
      ],
      review_status: [
        "pending",
        "approved",
        "rejected",
        "invite_sent",
        "joined",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
