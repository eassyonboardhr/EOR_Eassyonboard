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
          completion_percentage: number
          current_step: string
          employee_id: string
          id: string
          last_updated: string
        }
        Insert: {
          completion_percentage?: number
          current_step?: string
          employee_id: string
          id?: string
          last_updated?: string
        }
        Update: {
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
          invite_id: string | null
          invite_sent_at: string | null
          job_title: string | null
          onboarding_notes: string | null
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
          invite_id?: string | null
          invite_sent_at?: string | null
          job_title?: string | null
          onboarding_notes?: string | null
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
          invite_id?: string | null
          invite_sent_at?: string | null
          job_title?: string | null
          onboarding_notes?: string | null
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
          body: string
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
          body: string
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
          body?: string
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
      portal_users: {
        Row: {
          clerk_user_id: string
          created_at: string
          email: string
          employer_id: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["portal_role"]
          status: Database["public"]["Enums"]["account_status"]
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
          role: Database["public"]["Enums"]["portal_role"]
          status?: Database["public"]["Enums"]["account_status"]
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
          role?: Database["public"]["Enums"]["portal_role"]
          status?: Database["public"]["Enums"]["account_status"]
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
      [_ in never]: never
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
