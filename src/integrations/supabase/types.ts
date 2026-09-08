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
      hpm_admin_users: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean
          is_developer: boolean
          phone_wa: string | null
          pin_hash: string
          position: string | null
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          employee_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_developer?: boolean
          phone_wa?: string | null
          pin_hash: string
          position?: string | null
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_developer?: boolean
          phone_wa?: string | null
          pin_hash?: string
          position?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_admin_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_admin_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_announcements: {
        Row: {
          body: string
          company_id: string
          created_at: string
          created_by_admin_id: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_announcements_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "hpm_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_applicants: {
        Row: {
          ai_matching_score: number | null
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          handed_over_employee_id: string | null
          id: string
          job_vacancy_id: string
          phone: string | null
          resume_url: string | null
          status: string | null
        }
        Insert: {
          ai_matching_score?: number | null
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          handed_over_employee_id?: string | null
          id?: string
          job_vacancy_id: string
          phone?: string | null
          resume_url?: string | null
          status?: string | null
        }
        Update: {
          ai_matching_score?: number | null
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          handed_over_employee_id?: string | null
          id?: string
          job_vacancy_id?: string
          phone?: string | null
          resume_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_applicants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_applicants_handed_over_employee_id_fkey"
            columns: ["handed_over_employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_applicants_job_vacancy_id_fkey"
            columns: ["job_vacancy_id"]
            isOneToOne: false
            referencedRelation: "hpm_job_vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          company_id: string
          date: string
          distance_meters: number | null
          employee_id: string
          id: string
          is_outside_office: boolean | null
          lat_in: string | null
          late_in_reason: string | null
          late_out_reason: string | null
          long_in: string | null
          needs_supervisor_approval: boolean
          outside_location_note: string | null
          outside_task_status: string | null
          photo_url: string | null
          status: string | null
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          company_id: string
          date: string
          distance_meters?: number | null
          employee_id: string
          id?: string
          is_outside_office?: boolean | null
          lat_in?: string | null
          late_in_reason?: string | null
          late_out_reason?: string | null
          long_in?: string | null
          needs_supervisor_approval?: boolean
          outside_location_note?: string | null
          outside_task_status?: string | null
          photo_url?: string | null
          status?: string | null
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          company_id?: string
          date?: string
          distance_meters?: number | null
          employee_id?: string
          id?: string
          is_outside_office?: boolean | null
          lat_in?: string | null
          late_in_reason?: string | null
          late_out_reason?: string | null
          long_in?: string | null
          needs_supervisor_approval?: boolean
          outside_location_note?: string | null
          outside_task_status?: string | null
          photo_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_chat_conversations: {
        Row: {
          company_id: string
          created_at: string
          created_by_id: string | null
          created_by_type: string | null
          direct_key: string | null
          id: string
          name: string | null
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_id?: string | null
          created_by_type?: string | null
          direct_key?: string | null
          id?: string
          name?: string | null
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_id?: string | null
          created_by_type?: string | null
          direct_key?: string | null
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_chat_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_chat_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_name: string
          sender_type: string
          sender_user_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_name: string
          sender_type: string
          sender_user_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "hpm_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          participant_id: string
          participant_name: string
          participant_type: string
          participant_user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          participant_id: string
          participant_name: string
          participant_type: string
          participant_user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          participant_id?: string
          participant_name?: string
          participant_type?: string
          participant_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "hpm_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          jht_rate_percent: number
          job_level_enabled: boolean
          name: string
          office_lat: number | null
          office_lng: number | null
          office_radius_meters: number
          org_type: string | null
          payroll_cutoff_day: number
          pension_constant: number
          pension_years_multiplier: number
          phone: string | null
          rank_grade_enabled: boolean
          salary_grade_enabled: boolean
          subscription_status: string
          website: string | null
          whatsapp: string | null
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          jht_rate_percent?: number
          job_level_enabled?: boolean
          name: string
          office_lat?: number | null
          office_lng?: number | null
          office_radius_meters?: number
          org_type?: string | null
          payroll_cutoff_day?: number
          pension_constant?: number
          pension_years_multiplier?: number
          phone?: string | null
          rank_grade_enabled?: boolean
          salary_grade_enabled?: boolean
          subscription_status?: string
          website?: string | null
          whatsapp?: string | null
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          jht_rate_percent?: number
          job_level_enabled?: boolean
          name?: string
          office_lat?: number | null
          office_lng?: number | null
          office_radius_meters?: number
          org_type?: string | null
          payroll_cutoff_day?: number
          pension_constant?: number
          pension_years_multiplier?: number
          phone?: string | null
          rank_grade_enabled?: boolean
          salary_grade_enabled?: boolean
          subscription_status?: string
          website?: string | null
          whatsapp?: string | null
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: []
      }
      hpm_contacts: {
        Row: {
          admin_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          admin_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          admin_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_contacts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "hpm_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_employee_mutations: {
        Row: {
          created_at: string
          effective_date: string
          employee_id: string
          field_changed: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
        }
        Insert: {
          created_at?: string
          effective_date?: string
          employee_id: string
          field_changed: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string
          employee_id?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_employee_mutations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_employees: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          basic_salary: number
          blood_type: string | null
          bpjs_employment_number: string | null
          bpjs_health_number: string | null
          company_id: string
          contract_end_date: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string | null
          employment_status: string
          family_data: Json | null
          full_name: string
          health_allowance: number
          id: string
          insurance_allowance: number
          is_active: boolean
          join_date: string | null
          location_id: string | null
          meal_allowance: number
          nik: string | null
          nip: string | null
          npwp: string | null
          overtime_rate_per_hour: number
          performance_bonus: number
          phone: string | null
          position: string | null
          position_allowance: number
          position_id: string | null
          position_level: string
          ptkp_status: string | null
          rank: string | null
          rank_id: string | null
          resign_date: string | null
          salary_grade_id: string | null
          shift_type_id: string | null
          source: string | null
          supervisor_id: string | null
          transport_allowance: number
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          basic_salary?: number
          blood_type?: string | null
          bpjs_employment_number?: string | null
          bpjs_health_number?: string | null
          company_id: string
          contract_end_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employment_status?: string
          family_data?: Json | null
          full_name: string
          health_allowance?: number
          id?: string
          insurance_allowance?: number
          is_active?: boolean
          join_date?: string | null
          location_id?: string | null
          meal_allowance?: number
          nik?: string | null
          nip?: string | null
          npwp?: string | null
          overtime_rate_per_hour?: number
          performance_bonus?: number
          phone?: string | null
          position?: string | null
          position_allowance?: number
          position_id?: string | null
          position_level?: string
          ptkp_status?: string | null
          rank?: string | null
          rank_id?: string | null
          resign_date?: string | null
          salary_grade_id?: string | null
          shift_type_id?: string | null
          source?: string | null
          supervisor_id?: string | null
          transport_allowance?: number
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          basic_salary?: number
          blood_type?: string | null
          bpjs_employment_number?: string | null
          bpjs_health_number?: string | null
          company_id?: string
          contract_end_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employment_status?: string
          family_data?: Json | null
          full_name?: string
          health_allowance?: number
          id?: string
          insurance_allowance?: number
          is_active?: boolean
          join_date?: string | null
          location_id?: string | null
          meal_allowance?: number
          nik?: string | null
          nip?: string | null
          npwp?: string | null
          overtime_rate_per_hour?: number
          performance_bonus?: number
          phone?: string | null
          position?: string | null
          position_allowance?: number
          position_id?: string | null
          position_level?: string
          ptkp_status?: string | null
          rank?: string | null
          rank_id?: string | null
          resign_date?: string | null
          salary_grade_id?: string | null
          shift_type_id?: string | null
          source?: string | null
          supervisor_id?: string | null
          transport_allowance?: number
        }
        Relationships: [
          {
            foreignKeyName: "hpm_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "hpm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "hpm_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "hpm_ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_salary_grade_id_fkey"
            columns: ["salary_grade_id"]
            isOneToOne: false
            referencedRelation: "hpm_salary_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "hpm_shift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_employees_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_job_levels: {
        Row: {
          company_id: string
          created_at: string
          id: string
          level_order: number
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          level_order?: number
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          level_order?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_job_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_job_vacancies: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          description: string | null
          id: string
          requirements: string | null
          status: string | null
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          requirements?: string | null
          status?: string | null
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          requirements?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_job_vacancies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_leave_requests: {
        Row: {
          company_id: string
          created_at: string
          decided_at: string | null
          decision_note: string | null
          employee_id: string
          end_date: string
          id: string
          note: string | null
          reason_category: string
          start_date: string
          status: string
          supervisor_employee_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          employee_id: string
          end_date: string
          id?: string
          note?: string | null
          reason_category: string
          start_date: string
          status?: string
          supervisor_employee_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          note?: string | null
          reason_category?: string
          start_date?: string
          status?: string
          supervisor_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_leave_requests_supervisor_employee_id_fkey"
            columns: ["supervisor_employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_locations: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          parent_location_id: string | null
          phone: string | null
          radius_meters: number
          type: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          parent_location_id?: string | null
          phone?: string | null
          radius_meters?: number
          type?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          parent_location_id?: string | null
          phone?: string | null
          radius_meters?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "hpm_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_menu_permissions: {
        Row: {
          allowed: boolean
          company_id: string
          id: string
          menu_key: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          company_id: string
          id?: string
          menu_key: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          company_id?: string
          id?: string
          menu_key?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_menu_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_org_units: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          order_index: number
          parent_unit_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          parent_unit_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          parent_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_org_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_org_units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "hpm_org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_otp_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          purpose: string
          staff_user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          purpose?: string
          staff_user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_otp_codes_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "hpm_staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_outside_requests: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          decided_at: string | null
          decision_note: string | null
          distance_meters: number | null
          employee_id: string
          id: string
          lat: string | null
          location_note: string | null
          long: string | null
          photo_url: string | null
          requested_at: string
          stage: string
          status: string
          supervisor_employee_id: string | null
          task_status: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          distance_meters?: number | null
          employee_id: string
          id?: string
          lat?: string | null
          location_note?: string | null
          long?: string | null
          photo_url?: string | null
          requested_at?: string
          stage?: string
          status?: string
          supervisor_employee_id?: string | null
          task_status?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          distance_meters?: number | null
          employee_id?: string
          id?: string
          lat?: string | null
          location_note?: string | null
          long?: string | null
          photo_url?: string | null
          requested_at?: string
          stage?: string
          status?: string
          supervisor_employee_id?: string | null
          task_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_outside_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_outside_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_outside_requests_supervisor_employee_id_fkey"
            columns: ["supervisor_employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_payrolls: {
        Row: {
          allowances: number | null
          basic_salary: number
          bpjs_health_emp: number | null
          bpjs_tk_emp: number | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          net_salary: number
          overtime_pay: number | null
          payment_status: string | null
          period: string
          pph21_amount: number | null
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          bpjs_health_emp?: number | null
          bpjs_tk_emp?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          net_salary: number
          overtime_pay?: number | null
          payment_status?: string | null
          period: string
          pph21_amount?: number | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          bpjs_health_emp?: number | null
          bpjs_tk_emp?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          net_salary?: number
          overtime_pay?: number | null
          payment_status?: string | null
          period?: string
          pph21_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_payrolls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_pin_resets: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          reset_code_hash: string
          staff_user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          reset_code_hash: string
          staff_user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          reset_code_hash?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_pin_resets_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "hpm_staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_positions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          job_level_id: string | null
          name: string
          order_index: number
          org_unit_id: string
          reports_to_position_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          job_level_id?: string | null
          name: string
          order_index?: number
          org_unit_id: string
          reports_to_position_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          job_level_id?: string | null
          name?: string
          order_index?: number
          org_unit_id?: string
          reports_to_position_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_positions_job_level_id_fkey"
            columns: ["job_level_id"]
            isOneToOne: false
            referencedRelation: "hpm_job_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "hpm_org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "hpm_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_ranks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "hpm_ranks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_request_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_request_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_salary_grades: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "hpm_salary_grades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_shift_types: {
        Row: {
          company_id: string
          created_at: string
          days_of_week: number[]
          early_leave_grace_minutes: number
          end_time: string
          id: string
          late_grace_minutes: number
          name: string
          start_time: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_of_week?: number[]
          early_leave_grace_minutes?: number
          end_time?: string
          id?: string
          late_grace_minutes?: number
          name: string
          start_time?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_of_week?: number[]
          early_leave_grace_minutes?: number
          end_time?: string
          id?: string
          late_grace_minutes?: number
          name?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_shift_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hpm_staff_users: {
        Row: {
          company_id: string
          created_at: string
          created_by_admin_id: string | null
          device_id: string | null
          email: string | null
          employee_id: string | null
          face_descriptor: Json | null
          face_photo: string | null
          full_name: string
          id: string
          is_active: boolean
          ktp_extracted: Json | null
          ktp_nik_match: boolean | null
          ktp_photo: string | null
          nik_encrypted: string | null
          pin_hash: string
          user_id: string
          wa_verified: boolean
          whatsapp: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_admin_id?: string | null
          device_id?: string | null
          email?: string | null
          employee_id?: string | null
          face_descriptor?: Json | null
          face_photo?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          ktp_extracted?: Json | null
          ktp_nik_match?: boolean | null
          ktp_photo?: string | null
          nik_encrypted?: string | null
          pin_hash: string
          user_id: string
          wa_verified?: boolean
          whatsapp: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_admin_id?: string | null
          device_id?: string | null
          email?: string | null
          employee_id?: string | null
          face_descriptor?: Json | null
          face_photo?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          ktp_extracted?: Json | null
          ktp_nik_match?: boolean | null
          ktp_photo?: string | null
          nik_encrypted?: string | null
          pin_hash?: string
          user_id?: string
          wa_verified?: boolean
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "hpm_staff_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "hpm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_staff_users_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "hpm_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hpm_staff_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hpm_employees"
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
  public: {
    Enums: {},
  },
} as const
