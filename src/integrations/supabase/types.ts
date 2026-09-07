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
          full_name: string
          id: string
          is_active: boolean
          phone_wa: string | null
          pin_hash: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone_wa?: string | null
          pin_hash: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone_wa?: string | null
          pin_hash?: string
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
          long_in: string | null
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
          long_in?: string | null
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
          long_in?: string | null
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
      hpm_companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          office_lat: number | null
          office_lng: number | null
          office_radius_meters: number
          phone: string | null
          subscription_status: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          office_lat?: number | null
          office_lng?: number | null
          office_radius_meters?: number
          phone?: string | null
          subscription_status?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          office_lat?: number | null
          office_lng?: number | null
          office_radius_meters?: number
          phone?: string | null
          subscription_status?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      hpm_employees: {
        Row: {
          basic_salary: number
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          employment_status: string
          full_name: string
          id: string
          is_active: boolean
          join_date: string | null
          nik: string | null
          npwp: string | null
          phone: string | null
          ptkp_status: string | null
          source: string | null
        }
        Insert: {
          basic_salary?: number
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          employment_status?: string
          full_name: string
          id?: string
          is_active?: boolean
          join_date?: string | null
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          ptkp_status?: string | null
          source?: string | null
        }
        Update: {
          basic_salary?: number
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          employment_status?: string
          full_name?: string
          id?: string
          is_active?: boolean
          join_date?: string | null
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          ptkp_status?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hpm_employees_company_id_fkey"
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
          ktp_photo: string | null
          ktp_extracted: Json | null
          ktp_nik_match: boolean | null
          full_name: string
          id: string
          is_active: boolean
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
          ktp_photo?: string | null
          ktp_extracted?: Json | null
          ktp_nik_match?: boolean | null
          full_name: string
          id?: string
          is_active?: boolean
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
          ktp_photo?: string | null
          ktp_extracted?: Json | null
          ktp_nik_match?: boolean | null
          full_name?: string
          id?: string
          is_active?: boolean
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
