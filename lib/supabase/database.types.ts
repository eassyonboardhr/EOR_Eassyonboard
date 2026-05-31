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
      employee_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          employer_id: string
          full_name: string
          id: string
          job_title: string | null
          proposed_start_date: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          employer_id: string
          full_name: string
          id?: string
          job_title?: string | null
          proposed_start_date?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          employer_id?: string
          full_name?: string
          id?: string
          job_title?: string | null
          proposed_start_date?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
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
          full_name: string
          id: string
          job_title: string | null
          portal_user_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          employer_id: string
          full_name: string
          id?: string
          job_title?: string | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          employer_id?: string
          full_name?: string
          id?: string
          job_title?: string | null
          portal_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
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
            foreignKeyName: "employees_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: true
            referencedRelation: "portal_users"
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
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
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
            foreignKeyName: "leave_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          employer_id: string
          employer_notes: string | null
          id: string
          requested_by: string | null
          resignation_id: string | null
          status: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          employer_id: string
          employer_notes?: string | null
          id?: string
          requested_by?: string | null
          resignation_id?: string | null
          status?: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          employer_id?: string
          employer_notes?: string | null
          id?: string
          requested_by?: string | null
          resignation_id?: string | null
          status?: Database["public"]["Enums"]["offboarding_status"]
          target_last_working_day?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_cases_approved_by_fkey"
            columns: ["approved_by"]
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
          acknowledged_at: string | null
          admin_notes: string | null
          created_at: string
          employee_id: string
          employer_id: string
          employer_notes: string | null
          forwarded_at: string | null
          id: string
          preferred_last_working_day: string | null
          reason: string | null
          status: Database["public"]["Enums"]["resignation_status"]
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          admin_notes?: string | null
          created_at?: string
          employee_id: string
          employer_id: string
          employer_notes?: string | null
          forwarded_at?: string | null
          id?: string
          preferred_last_working_day?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["resignation_status"]
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          admin_notes?: string | null
          created_at?: string
          employee_id?: string
          employer_id?: string
          employer_notes?: string | null
          forwarded_at?: string | null
          id?: string
          preferred_last_working_day?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["resignation_status"]
          updated_at?: string
        }
        Relationships: [
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
