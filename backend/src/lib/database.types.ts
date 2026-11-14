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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      anxiety_entries: {
        Row: {
          detail: string | null
          entry_id: number
          id: number
          severity: number | null
        }
        Insert: {
          detail?: string | null
          entry_id: number
          id?: never
          severity?: number | null
        }
        Update: {
          detail?: string | null
          entry_id?: number
          id?: never
          severity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anxiety_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          appointment_type_id: number | null
          created_at: string | null
          followup_for_id: number | null
          id: number
          location: string | null
          notes: string | null
          person_id: number
          provider_id: number | null
          questions: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          appointment_type_id?: number | null
          created_at?: string | null
          followup_for_id?: number | null
          id?: never
          location?: string | null
          notes?: string | null
          person_id: number
          provider_id?: number | null
          questions?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          appointment_type_id?: number | null
          created_at?: string | null
          followup_for_id?: number | null
          id?: never
          location?: string | null
          notes?: string | null
          person_id?: number
          provider_id?: number | null
          questions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_followup_for_id_fkey"
            columns: ["followup_for_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_dumps: {
        Row: {
          body_md: string | null
          created_at: string | null
          dump_date: string
          entry_id: number | null
          id: number
          updated_at: string | null
        }
        Insert: {
          body_md?: string | null
          created_at?: string | null
          dump_date: string
          entry_id?: number | null
          id?: never
          updated_at?: string | null
        }
        Update: {
          body_md?: string | null
          created_at?: string | null
          dump_date?: string
          entry_id?: number | null
          id?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_dumps_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          created_at: string | null
          id: number
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          token?: string
        }
        Update: {
          created_at?: string | null
          id?: never
          token?: string
        }
        Relationships: []
      }
      chart_categories: {
        Row: {
          id: number
          is_active: boolean
          name: string
          protected: boolean
          sort_order: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          name: string
          protected?: boolean
          sort_order?: number
        }
        Update: {
          id?: never
          is_active?: boolean
          name?: string
          protected?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      chart_definitions: {
        Row: {
          category_id: number | null
          chart_type: Database["public"]["Enums"]["chart_type_enum"]
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number
          title: string
        }
        Insert: {
          category_id?: number | null
          chart_type?: Database["public"]["Enums"]["chart_type_enum"]
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          category_id?: number | null
          chart_type?: Database["public"]["Enums"]["chart_type_enum"]
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chart_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_trackable_links: {
        Row: {
          chart_id: number
          id: number
          metric_role: Database["public"]["Enums"]["metric_role_enum"]
          sort_order: number
          trackable_id: number
        }
        Insert: {
          chart_id: number
          id?: never
          metric_role?: Database["public"]["Enums"]["metric_role_enum"]
          sort_order?: number
          trackable_id: number
        }
        Update: {
          chart_id?: number
          id?: never
          metric_role?: Database["public"]["Enums"]["metric_role_enum"]
          sort_order?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chart_trackable_links_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "chart_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_trackable_links_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: number
          created_at: string | null
          id: number
          is_checked: boolean
          item_text: string
          person_id: number
          sort_order: number | null
        }
        Insert: {
          checklist_id: number
          created_at?: string | null
          id?: never
          is_checked?: boolean
          item_text: string
          person_id: number
          sort_order?: number | null
        }
        Update: {
          checklist_id?: number
          created_at?: string | null
          id?: never
          is_checked?: boolean
          item_text?: string
          person_id?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          checklist_label: string | null
          checklist_title: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          checklist_label?: string | null
          checklist_title: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          checklist_label?: string | null
          checklist_title?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      component_cards: {
        Row: {
          card_id: number
          id: number
          module: Database["public"]["Enums"]["module_enum"]
          sort_order: number
        }
        Insert: {
          card_id: number
          id?: never
          module: Database["public"]["Enums"]["module_enum"]
          sort_order?: number
        }
        Update: {
          card_id?: number
          id?: never
          module?: Database["public"]["Enums"]["module_enum"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "component_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "section_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      crashes: {
        Row: {
          entry_id: number
          id: number
          severity: number | null
          timing: string | null
        }
        Insert: {
          entry_id: number
          id?: never
          severity?: number | null
          timing?: string | null
        }
        Update: {
          entry_id?: number
          id?: never
          severity?: number | null
          timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crashes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          created_at: string | null
          entry_date: string
          icon_id: number | null
          id: number
          intention_id: number | null
          summary: string | null
          updated_at: string | null
          word: string | null
        }
        Insert: {
          created_at?: string | null
          entry_date: string
          icon_id?: number | null
          id?: never
          intention_id?: number | null
          summary?: string | null
          updated_at?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          icon_id?: number | null
          id?: never
          intention_id?: number | null
          summary?: string | null
          updated_at?: string | null
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_intention_id_fkey"
            columns: ["intention_id"]
            isOneToOne: false
            referencedRelation: "intentions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_symptom_entries: {
        Row: {
          entry_id: number
          id: number
          severity: number | null
          symptom_type_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          severity?: number | null
          symptom_type_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          severity?: number | null
          symptom_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_symptom_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_symptom_entries_symptom_type_id_fkey"
            columns: ["symptom_type_id"]
            isOneToOne: false
            referencedRelation: "symptom_types"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_trackables: {
        Row: {
          category_id: number | null
          color_hex: string | null
          icon_id: number | null
          id: number
          is_active: boolean
          name: string
          parent_trackable_id: number | null
          protected: boolean
          sort_order: number
          track_type: Database["public"]["Enums"]["track_type_enum"]
        }
        Insert: {
          category_id?: number | null
          color_hex?: string | null
          icon_id?: number | null
          id?: never
          is_active?: boolean
          name: string
          parent_trackable_id?: number | null
          protected?: boolean
          sort_order?: number
          track_type: Database["public"]["Enums"]["track_type_enum"]
        }
        Update: {
          category_id?: number | null
          color_hex?: string | null
          icon_id?: number | null
          id?: never
          is_active?: boolean
          name?: string
          parent_trackable_id?: number | null
          protected?: boolean
          sort_order?: number
          track_type?: Database["public"]["Enums"]["track_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "daily_trackables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "trackable_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trackables_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trackables_parent_trackable_id_fkey"
            columns: ["parent_trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          created_at: string | null
          diagnosed_date: string | null
          diagnosis_name: string
          id: number
          is_active: boolean
          notes: string | null
          person_id: number
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          diagnosed_date?: string | null
          diagnosis_name: string
          id?: never
          is_active?: boolean
          notes?: string | null
          person_id: number
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          diagnosed_date?: string | null
          diagnosis_name?: string
          id?: never
          is_active?: boolean
          notes?: string | null
          person_id?: number
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      ess_answer_types: {
        Row: {
          answer_label: string
          answer_value: number
          id: number
          is_active: boolean
          sort_order: number | null
        }
        Insert: {
          answer_label: string
          answer_value: number
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Update: {
          answer_label?: string
          answer_value?: number
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      ess_entries: {
        Row: {
          created_at: string | null
          entry_id: number
          id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entry_id: number
          id?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entry_id?: number
          id?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ess_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ess_question_responses: {
        Row: {
          answer_type_id: number
          ess_entry_id: number
          id: number
          question_type_id: number
        }
        Insert: {
          answer_type_id: number
          ess_entry_id: number
          id?: never
          question_type_id: number
        }
        Update: {
          answer_type_id?: number
          ess_entry_id?: number
          id?: never
          question_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ess_question_responses_answer_type_id_fkey"
            columns: ["answer_type_id"]
            isOneToOne: false
            referencedRelation: "ess_answer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ess_question_responses_ess_entry_id_fkey"
            columns: ["ess_entry_id"]
            isOneToOne: false
            referencedRelation: "ess_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ess_question_responses_question_type_id_fkey"
            columns: ["question_type_id"]
            isOneToOne: false
            referencedRelation: "ess_question_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ess_question_types: {
        Row: {
          id: number
          is_active: boolean
          question_label: string
          sort_order: number | null
          trackable_id: number | null
        }
        Insert: {
          id?: never
          is_active?: boolean
          question_label: string
          sort_order?: number | null
          trackable_id?: number | null
        }
        Update: {
          id?: never
          is_active?: boolean
          question_label?: string
          sort_order?: number | null
          trackable_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ess_question_types_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      icons: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          name: string
          protected: boolean
          sort_order: number
          svg_data: string
          tags: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          name: string
          protected?: boolean
          sort_order?: number
          svg_data: string
          tags?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          name?: string
          protected?: boolean
          sort_order?: number
          svg_data?: string
          tags?: string | null
        }
        Relationships: []
      }
      info_field_types: {
        Row: {
          field_label: string
          field_type: string
          group_id: number
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          field_label: string
          field_type?: string
          group_id: number
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          field_label?: string
          field_type?: string
          group_id?: number
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "info_field_types_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "info_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      info_field_values: {
        Row: {
          field_type_id: number
          field_value: string | null
          id: number
          person_id: number | null
          updated_at: string | null
        }
        Insert: {
          field_type_id: number
          field_value?: string | null
          id?: never
          person_id?: number | null
          updated_at?: string | null
        }
        Update: {
          field_type_id?: number
          field_value?: string | null
          id?: never
          person_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "info_field_values_field_type_id_fkey"
            columns: ["field_type_id"]
            isOneToOne: false
            referencedRelation: "info_field_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_field_values_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      info_groups: {
        Row: {
          group_title: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          group_title: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          group_title?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      intentions: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          protected: boolean
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          value: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          value?: string
        }
        Relationships: []
      }
      item_list_entries: {
        Row: {
          created_at: string | null
          entry_date: string | null
          entry_text: string
          id: number
          list_id: number
          person_id: number | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          entry_date?: string | null
          entry_text: string
          id?: never
          list_id: number
          person_id?: number | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          entry_date?: string | null
          entry_text?: string
          id?: never
          list_id?: number
          person_id?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_list_entries_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "item_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_list_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      item_lists: {
        Row: {
          id: number
          is_active: boolean
          list_label: string | null
          list_title: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          id?: never
          is_active?: boolean
          list_label?: string | null
          list_title: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          id?: never
          is_active?: boolean
          list_label?: string | null
          list_title?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      journal_categories: {
        Row: {
          category_name: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          category_name: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      journal_prompt_responses: {
        Row: {
          created_at: string | null
          entry_id: number | null
          id: number
          prompt_id: number
          response_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entry_id?: number | null
          id?: never
          prompt_id: number
          response_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entry_id?: number | null
          id?: never
          prompt_id?: number
          response_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_prompt_responses_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "journal_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_prompts: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          is_active: boolean
          prompt_text: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: never
          is_active?: boolean
          prompt_text: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: never
          is_active?: boolean
          prompt_text?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_prompts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "journal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      last_time_boolean: {
        Row: {
          icon_id: number | null
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number
          trackable_id: number
        }
        Insert: {
          icon_id?: number | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number
          trackable_id: number
        }
        Update: {
          icon_id?: number | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "last_time_boolean_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_time_boolean_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      last_time_custom: {
        Row: {
          custom_value: string
          icon_id: number | null
          id: number
          is_active: boolean
          last_date: string | null
          protected: boolean
          sort_order: number
        }
        Insert: {
          custom_value: string
          icon_id?: number | null
          id?: never
          is_active?: boolean
          last_date?: string | null
          protected?: boolean
          sort_order?: number
        }
        Update: {
          custom_value?: string
          icon_id?: number | null
          id?: never
          is_active?: boolean
          last_date?: string | null
          protected?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "last_time_custom_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
        ]
      }
      last_time_media: {
        Row: {
          genre_id: number | null
          icon_id: number | null
          id: number
          is_active: boolean
          label: string
          protected: boolean
          sort_order: number
          status_id: number | null
          type_id: number | null
        }
        Insert: {
          genre_id?: number | null
          icon_id?: number | null
          id?: never
          is_active?: boolean
          label: string
          protected?: boolean
          sort_order?: number
          status_id?: number | null
          type_id?: number | null
        }
        Update: {
          genre_id?: number | null
          icon_id?: number | null
          id?: never
          is_active?: boolean
          label?: string
          protected?: boolean
          sort_order?: number
          status_id?: number | null
          type_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "last_time_media_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "media_genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_time_media_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_time_media_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "media_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_time_media_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "media_types"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          created_at: string | null
          entry_date: string
          id: number
          log_id: number
          person_id: number | null
        }
        Insert: {
          created_at?: string | null
          entry_date: string
          id?: never
          log_id: number
          person_id?: number | null
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: never
          log_id?: number
          person_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "log_schemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entry_values: {
        Row: {
          field_id: number
          field_value: string | null
          id: number
          log_entry_id: number
        }
        Insert: {
          field_id: number
          field_value?: string | null
          id?: never
          log_entry_id: number
        }
        Update: {
          field_id?: number
          field_value?: string | null
          id?: never
          log_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "log_entry_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "log_schema_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_entry_values_log_entry_id_fkey"
            columns: ["log_entry_id"]
            isOneToOne: false
            referencedRelation: "log_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      log_schema_field_options: {
        Row: {
          field_id: number
          id: number
          is_active: boolean
          option_value: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          field_id: number
          id?: never
          is_active?: boolean
          option_value: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          field_id?: number
          id?: never
          is_active?: boolean
          option_value?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_schema_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "log_schema_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      log_schema_fields: {
        Row: {
          field_key: string
          field_label: string
          field_type: string
          id: number
          is_active: boolean
          log_id: number
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          field_key: string
          field_label: string
          field_type?: string
          id?: never
          is_active?: boolean
          log_id: number
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          field_key?: string
          field_label?: string
          field_type?: string
          id?: never
          is_active?: boolean
          log_id?: number
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_schema_fields_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "log_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      log_schemas: {
        Row: {
          id: number
          is_active: boolean
          log_title: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          id?: never
          is_active?: boolean
          log_title: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          id?: never
          is_active?: boolean
          log_title?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      media_entries: {
        Row: {
          created_at: string | null
          creator: string | null
          id: number
          media_type_id: number
          notes: string | null
          platform: string | null
          rating: number | null
          review: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator?: string | null
          id?: never
          media_type_id: number
          notes?: string | null
          platform?: string | null
          rating?: number | null
          review?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator?: string | null
          id?: never
          media_type_id?: number
          notes?: string | null
          platform?: string | null
          rating?: number | null
          review?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_entries_media_type_id_fkey"
            columns: ["media_type_id"]
            isOneToOne: false
            referencedRelation: "media_types"
            referencedColumns: ["id"]
          },
        ]
      }
      media_genre_entries: {
        Row: {
          genre_id: number
          id: number
          media_entry_id: number
        }
        Insert: {
          genre_id: number
          id?: never
          media_entry_id: number
        }
        Update: {
          genre_id?: number
          id?: never
          media_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_genre_entries_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "media_genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_genre_entries_media_entry_id_fkey"
            columns: ["media_entry_id"]
            isOneToOne: false
            referencedRelation: "media_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      media_genres: {
        Row: {
          genre_name: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          genre_name: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          genre_name?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      media_notes: {
        Row: {
          body_md: string
          created_at: string | null
          id: number
          media_entry_id: number
          note_date: string
          updated_at: string | null
        }
        Insert: {
          body_md: string
          created_at?: string | null
          id?: never
          media_entry_id: number
          note_date?: string
          updated_at?: string | null
        }
        Update: {
          body_md?: string
          created_at?: string | null
          id?: never
          media_entry_id?: number
          note_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_notes_media_entry_id_fkey"
            columns: ["media_entry_id"]
            isOneToOne: false
            referencedRelation: "media_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      media_status_entries: {
        Row: {
          created_at: string
          id: number
          media_entry_id: number
          status_date: string
          status_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          media_entry_id: number
          status_date?: string
          status_id: number
        }
        Update: {
          created_at?: string
          id?: never
          media_entry_id?: number
          status_date?: string
          status_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_status_entries_media_entry_id_fkey"
            columns: ["media_entry_id"]
            isOneToOne: false
            referencedRelation: "media_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_status_entries_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "media_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_status_type_links: {
        Row: {
          id: number
          media_type_id: number
          status_id: number
        }
        Insert: {
          id?: never
          media_type_id: number
          status_id: number
        }
        Update: {
          id?: never
          media_type_id?: number
          status_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_status_type_links_media_type_id_fkey"
            columns: ["media_type_id"]
            isOneToOne: false
            referencedRelation: "media_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_status_type_links_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "media_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_statuses: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          status_name: string
          status_type: Database["public"]["Enums"]["media_status_type_enum"]
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          status_name: string
          status_type?: Database["public"]["Enums"]["media_status_type_enum"]
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          status_name?: string
          status_type?: Database["public"]["Enums"]["media_status_type_enum"]
        }
        Relationships: []
      }
      media_types: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      medication_timing_types: {
        Row: {
          dose_interval_days: number | null
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          timing_name: string
        }
        Insert: {
          dose_interval_days?: number | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          timing_name: string
        }
        Update: {
          dose_interval_days?: number | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          timing_name?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          created_at: string | null
          generic_name: string | null
          id: number
          is_active: boolean
          medication_name: string
          protected: boolean
        }
        Insert: {
          created_at?: string | null
          generic_name?: string | null
          id?: never
          is_active?: boolean
          medication_name: string
          protected?: boolean
        }
        Update: {
          created_at?: string | null
          generic_name?: string | null
          id?: never
          is_active?: boolean
          medication_name?: string
          protected?: boolean
        }
        Relationships: []
      }
      naps: {
        Row: {
          duration_min: number | null
          id: number
          nap_count: number | null
          sleep_entry_id: number
          was_refreshing: boolean | null
        }
        Insert: {
          duration_min?: number | null
          id?: never
          nap_count?: number | null
          sleep_entry_id: number
          was_refreshing?: boolean | null
        }
        Update: {
          duration_min?: number | null
          id?: never
          nap_count?: number | null
          sleep_entry_id?: number
          was_refreshing?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "naps_sleep_entry_id_fkey"
            columns: ["sleep_entry_id"]
            isOneToOne: false
            referencedRelation: "sleep_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          birth_date: string | null
          category_id: number | null
          created_at: string | null
          id: number
          is_active: boolean
          is_self: boolean
          person_name: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          birth_date?: string | null
          category_id?: number | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          is_self?: boolean
          person_name: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          birth_date?: string | null
          category_id?: number | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          is_self?: boolean
          person_name?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "people_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "people_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      people_categories: {
        Row: {
          category_name: string
          created_at: string | null
          id: number
          is_active: boolean
          is_assignable: boolean
          protected: boolean
          sort_order: number
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: never
          is_active?: boolean
          is_assignable?: boolean
          protected?: boolean
          sort_order?: number
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: never
          is_active?: boolean
          is_assignable?: boolean
          protected?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      person_checklist_links: {
        Row: {
          checklist_id: number
          id: number
          person_id: number
        }
        Insert: {
          checklist_id: number
          id?: never
          person_id: number
        }
        Update: {
          checklist_id?: number
          id?: never
          person_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_checklist_links_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_checklist_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_info_group_links: {
        Row: {
          id: number
          info_group_id: number
          person_id: number
        }
        Insert: {
          id?: never
          info_group_id: number
          person_id: number
        }
        Update: {
          id?: never
          info_group_id?: number
          person_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_info_group_links_info_group_id_fkey"
            columns: ["info_group_id"]
            isOneToOne: false
            referencedRelation: "info_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_info_group_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_item_list_links: {
        Row: {
          id: number
          list_id: number
          person_id: number
        }
        Insert: {
          id?: never
          list_id: number
          person_id: number
        }
        Update: {
          id?: never
          list_id?: number
          person_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_item_list_links_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "item_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_item_list_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_log_links: {
        Row: {
          id: number
          log_id: number
          person_id: number
        }
        Insert: {
          id?: never
          log_id: number
          person_id: number
        }
        Update: {
          id?: never
          log_id?: number
          person_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_log_links_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "log_schemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_log_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy: {
        Row: {
          address: string | null
          id: number
          pharmacy_name: string | null
          phone: string | null
          portal_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          id?: never
          pharmacy_name?: string | null
          phone?: string | null
          portal_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          id?: never
          pharmacy_name?: string | null
          phone?: string | null
          portal_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pre_bed_consumption_types: {
        Row: {
          id: number
          is_active: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          id?: never
          is_active?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      prescription_changes: {
        Row: {
          appointment_id: number | null
          change_notes: string | null
          created_at: string | null
          field_changed: string
          id: number
          new_value: string | null
          prescription_id: number
          previous_value: string | null
        }
        Insert: {
          appointment_id?: number | null
          change_notes?: string | null
          created_at?: string | null
          field_changed: string
          id?: never
          new_value?: string | null
          prescription_id: number
          previous_value?: string | null
        }
        Update: {
          appointment_id?: number | null
          change_notes?: string | null
          created_at?: string | null
          field_changed?: string
          id?: never
          new_value?: string | null
          prescription_id?: number
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_changes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_changes_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_entries: {
        Row: {
          entry_id: number
          id: number
          prescription_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          prescription_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          prescription_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_entries_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_refills: {
        Row: {
          created_at: string | null
          days_supply: number | null
          fill_date: string
          id: number
          notes: string | null
          prescription_id: number
          refill_due_date: string | null
        }
        Insert: {
          created_at?: string | null
          days_supply?: number | null
          fill_date: string
          id?: never
          notes?: string | null
          prescription_id: number
          refill_due_date?: string | null
        }
        Update: {
          created_at?: string | null
          days_supply?: number | null
          fill_date?: string
          id?: never
          notes?: string | null
          prescription_id?: number
          refill_due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_refills_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          alias: string | null
          created_at: string | null
          discontinued_date: string | null
          dose: string | null
          id: number
          is_active: boolean
          medication_id: number
          person_id: number
          prescriber_id: number | null
          protected: boolean
          purpose: string | null
          sort_order: number | null
          start_date: string | null
          timing_type_id: number | null
          updated_at: string | null
        }
        Insert: {
          alias?: string | null
          created_at?: string | null
          discontinued_date?: string | null
          dose?: string | null
          id?: never
          is_active?: boolean
          medication_id: number
          person_id: number
          prescriber_id?: number | null
          protected?: boolean
          purpose?: string | null
          sort_order?: number | null
          start_date?: string | null
          timing_type_id?: number | null
          updated_at?: string | null
        }
        Update: {
          alias?: string | null
          created_at?: string | null
          discontinued_date?: string | null
          dose?: string | null
          id?: never
          is_active?: boolean
          medication_id?: number
          person_id?: number
          prescriber_id?: number | null
          protected?: boolean
          purpose?: string | null
          sort_order?: number | null
          start_date?: string | null
          timing_type_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_prescriber_id_fkey"
            columns: ["prescriber_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_timing_type_id_fkey"
            columns: ["timing_type_id"]
            isOneToOne: false
            referencedRelation: "medication_timing_types"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_types: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          is_active: boolean
          phone: string | null
          portal_url: string | null
          practice_name: string | null
          protected: boolean
          provider_name: string | null
          provider_type_id: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          phone?: string | null
          portal_url?: string | null
          practice_name?: string | null
          protected?: boolean
          provider_name?: string | null
          provider_type_id: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: never
          is_active?: boolean
          phone?: string | null
          portal_url?: string | null
          practice_name?: string | null
          protected?: boolean
          provider_name?: string | null
          provider_type_id?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_provider_type_id_fkey"
            columns: ["provider_type_id"]
            isOneToOne: false
            referencedRelation: "provider_types"
            referencedColumns: ["id"]
          },
        ]
      }
      section_cards: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          section_id: number
          sort_order: number
          title: string | null
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          section_id: number
          sort_order?: number
          title?: string | null
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          section_id?: number
          sort_order?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          area: Database["public"]["Enums"]["area_enum"]
          id: number
          is_active: boolean
          name: string
          protected: boolean
          sort_order: number
        }
        Insert: {
          area: Database["public"]["Enums"]["area_enum"]
          id?: never
          is_active?: boolean
          name: string
          protected?: boolean
          sort_order?: number
        }
        Update: {
          area?: Database["public"]["Enums"]["area_enum"]
          id?: never
          is_active?: boolean
          name?: string
          protected?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      sleep_consumption_entries: {
        Row: {
          consumption_type_id: number
          id: number
          sleep_entry_id: number
        }
        Insert: {
          consumption_type_id: number
          id?: never
          sleep_entry_id: number
        }
        Update: {
          consumption_type_id?: number
          id?: never
          sleep_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sleep_consumption_entries_consumption_type_id_fkey"
            columns: ["consumption_type_id"]
            isOneToOne: false
            referencedRelation: "pre_bed_consumption_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_consumption_entries_sleep_entry_id_fkey"
            columns: ["sleep_entry_id"]
            isOneToOne: false
            referencedRelation: "sleep_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_entries: {
        Row: {
          bedtime: string | null
          created_at: string | null
          entry_id: number
          hours_slept: number | null
          id: number
          osa_event_count: number | null
          sleep_inertia_min: number | null
          sleep_latency_min: number | null
          sleep_notes: string | null
          sleep_quality: number | null
          today_pre_bed_activity: string | null
          updated_at: string | null
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string | null
          entry_id: number
          hours_slept?: number | null
          id?: never
          osa_event_count?: number | null
          sleep_inertia_min?: number | null
          sleep_latency_min?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          today_pre_bed_activity?: string | null
          updated_at?: string | null
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string | null
          entry_id?: number
          hours_slept?: number | null
          id?: never
          osa_event_count?: number | null
          sleep_inertia_min?: number | null
          sleep_latency_min?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          today_pre_bed_activity?: string | null
          updated_at?: string | null
          wake_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_event_types: {
        Row: {
          id: number
          is_active: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          id?: never
          is_active?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          id?: never
          is_active?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      sleep_events: {
        Row: {
          event_type_id: number
          id: number
          sleep_entry_id: number
        }
        Insert: {
          event_type_id: number
          id?: never
          sleep_entry_id: number
        }
        Update: {
          event_type_id?: number
          id?: never
          sleep_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sleep_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "sleep_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_events_sleep_entry_id_fkey"
            columns: ["sleep_entry_id"]
            isOneToOne: false
            referencedRelation: "sleep_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_timing_entries: {
        Row: {
          id: number
          sleep_entry_id: number
          timing_category_id: number
          timing_option_id: number
        }
        Insert: {
          id?: never
          sleep_entry_id: number
          timing_category_id: number
          timing_option_id: number
        }
        Update: {
          id?: never
          sleep_entry_id?: number
          timing_category_id?: number
          timing_option_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sleep_timing_entries_sleep_entry_id_fkey"
            columns: ["sleep_entry_id"]
            isOneToOne: false
            referencedRelation: "sleep_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_timing_entries_timing_category_id_fkey"
            columns: ["timing_category_id"]
            isOneToOne: false
            referencedRelation: "timing_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_timing_entries_timing_option_id_fkey"
            columns: ["timing_option_id"]
            isOneToOne: false
            referencedRelation: "timing_options"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_categories: {
        Row: {
          category_name: string
          id: number
          is_active: boolean
          sort_order: number | null
        }
        Insert: {
          category_name: string
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      symptom_types: {
        Row: {
          category_id: number
          id: number
          is_active: boolean
          sort_order: number | null
          symptom_name: string
        }
        Insert: {
          category_id: number
          id?: never
          is_active?: boolean
          sort_order?: number | null
          symptom_name: string
        }
        Update: {
          category_id?: number
          id?: never
          is_active?: boolean
          sort_order?: number | null
          symptom_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "symptom_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_entries: {
        Row: {
          entry_id: number
          id: number
          tag_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          tag_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_entries_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          tag_value: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          tag_value: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          tag_value?: string
        }
        Relationships: []
      }
      task_tag_entries: {
        Row: {
          id: number
          tag_id: number
          task_id: number
        }
        Insert: {
          id?: never
          tag_id: number
          task_id: number
        }
        Update: {
          id?: never
          tag_id?: number
          task_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_tag_entries_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tag_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          body_md: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          due_time: string | null
          id: number
          person_id: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_days: string | null
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          recurrence_interval: number | null
          reminder_at: string | null
          reminder_last_sent: string | null
          snoozed_until: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          body_md?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: never
          person_id?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_days?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          reminder_at?: string | null
          reminder_last_sent?: string | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          body_md?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: never
          person_id?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_days?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          reminder_at?: string | null
          reminder_last_sent?: string | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_event_types: {
        Row: {
          color_hex: string | null
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
          type_name: string
        }
        Insert: {
          color_hex?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name: string
        }
        Update: {
          color_hex?: string | null
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
          type_name?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string | null
          entry_id: number
          event_title: string
          event_type_id: number | null
          group_name: string | null
          id: number
          started_at: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          entry_id: number
          event_title: string
          event_type_id?: number | null
          group_name?: string | null
          id?: never
          started_at: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          entry_id?: number
          event_title?: string
          event_type_id?: number | null
          group_name?: string | null
          id?: never
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "timeline_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      timing_categories: {
        Row: {
          category_name: string
          id: number
          is_active: boolean
          sort_order: number | null
        }
        Insert: {
          category_name: string
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          id?: never
          is_active?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      timing_options: {
        Row: {
          id: number
          is_active: boolean
          option_name: string
          sort_order: number | null
        }
        Insert: {
          id?: never
          is_active?: boolean
          option_name: string
          sort_order?: number | null
        }
        Update: {
          id?: never
          is_active?: boolean
          option_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      trackable_aggregate_entries: {
        Row: {
          entry_id: number
          id: number
          option_id: number
          question_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          option_id: number
          question_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          option_id?: number
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_aggregate_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_aggregate_entries_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "trackable_aggregate_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_aggregate_entries_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "trackable_aggregate_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_aggregate_options: {
        Row: {
          id: number
          label: string
          value: number
        }
        Insert: {
          id?: never
          label: string
          value: number
        }
        Update: {
          id?: never
          label?: string
          value?: number
        }
        Relationships: []
      }
      trackable_aggregate_question_options: {
        Row: {
          id: number
          is_active: boolean
          option_id: number
          protected: boolean
          question_id: number
          sort_order: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          option_id: number
          protected?: boolean
          question_id: number
          sort_order?: number
        }
        Update: {
          id?: never
          is_active?: boolean
          option_id?: number
          protected?: boolean
          question_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_aggregate_question_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "trackable_aggregate_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_aggregate_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "trackable_aggregate_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_aggregate_questions: {
        Row: {
          id: number
          is_active: boolean
          protected: boolean
          question: string
          sort_order: number
          trackable_id: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          protected?: boolean
          question: string
          sort_order?: number
          trackable_id: number
        }
        Update: {
          id?: never
          is_active?: boolean
          protected?: boolean
          question?: string
          sort_order?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_aggregate_questions_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_boolean_entries: {
        Row: {
          entry_id: number
          id: number
          trackable_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          trackable_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_boolean_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_boolean_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_categories: {
        Row: {
          category_name: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          category_name: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      trackable_category_cards: {
        Row: {
          card_id: number
          id: number
          sort_order: number
          trackable_category_id: number
        }
        Insert: {
          card_id: number
          id?: never
          sort_order?: number
          trackable_category_id: number
        }
        Update: {
          card_id?: number
          id?: never
          sort_order?: number
          trackable_category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_category_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "section_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_category_cards_trackable_category_id_fkey"
            columns: ["trackable_category_id"]
            isOneToOne: false
            referencedRelation: "trackable_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_choice_entries: {
        Row: {
          entry_id: number
          id: number
          option_id: number
          trackable_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          option_id: number
          trackable_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          option_id?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_choice_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_choice_entries_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "trackable_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_choice_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_choice_options: {
        Row: {
          id: number
          is_active: boolean
          option_id: number
          protected: boolean
          sort_order: number
          trackable_id: number
        }
        Insert: {
          id?: never
          is_active?: boolean
          option_id: number
          protected?: boolean
          sort_order?: number
          trackable_id: number
        }
        Update: {
          id?: never
          is_active?: boolean
          option_id?: number
          protected?: boolean
          sort_order?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_choice_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "trackable_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_choice_options_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_combo_entries: {
        Row: {
          entry_id: number
          id: number
          trackable_id: number
          value: number | null
        }
        Insert: {
          entry_id: number
          id?: never
          trackable_id: number
          value?: number | null
        }
        Update: {
          entry_id?: number
          id?: never
          trackable_id?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trackable_combo_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_combo_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_icon_entries: {
        Row: {
          entry_id: number
          icon_id: number
          id: number
          trackable_id: number
        }
        Insert: {
          entry_id: number
          icon_id: number
          id?: never
          trackable_id: number
        }
        Update: {
          entry_id?: number
          icon_id?: number
          id?: never
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_icon_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_icon_entries_icon_id_fkey"
            columns: ["icon_id"]
            isOneToOne: false
            referencedRelation: "icons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_icon_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_numeric_entries: {
        Row: {
          entry_id: number
          id: number
          trackable_id: number
          value: number
        }
        Insert: {
          entry_id: number
          id?: never
          trackable_id: number
          value: number
        }
        Update: {
          entry_id?: number
          id?: never
          trackable_id?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_numeric_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_numeric_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_options: {
        Row: {
          id: number
          value: string
        }
        Insert: {
          id?: never
          value: string
        }
        Update: {
          id?: never
          value?: string
        }
        Relationships: []
      }
      trackable_prescription: {
        Row: {
          id: number
          prescription_id: number
          trackable_id: number
        }
        Insert: {
          id?: never
          prescription_id: number
          trackable_id: number
        }
        Update: {
          id?: never
          prescription_id?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_prescription_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_prescription_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_ranges: {
        Row: {
          id: number
          range_max: number
          range_min: number
          range_step: number
          trackable_id: number
        }
        Insert: {
          id?: never
          range_max: number
          range_min: number
          range_step?: number
          trackable_id: number
        }
        Update: {
          id?: never
          range_max?: number
          range_min?: number
          range_step?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_ranges_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: true
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_tag_entries: {
        Row: {
          entry_id: number
          id: number
          tag_id: number
          trackable_id: number
        }
        Insert: {
          entry_id: number
          id?: never
          tag_id: number
          trackable_id: number
        }
        Update: {
          entry_id?: number
          id?: never
          tag_id?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_tag_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_tag_entries_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_tag_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_text_entries: {
        Row: {
          entry_id: number
          id: number
          trackable_id: number
          value: string
        }
        Insert: {
          entry_id: number
          id?: never
          trackable_id: number
          value: string
        }
        Update: {
          entry_id?: number
          id?: never
          trackable_id?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "trackable_text_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_text_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_time_entries: {
        Row: {
          entry_id: number
          id: number
          trackable_id: number
          value: string
        }
        Insert: {
          entry_id: number
          id?: never
          trackable_id: number
          value: string
        }
        Update: {
          entry_id?: number
          id?: never
          trackable_id?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "trackable_time_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_time_entries_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_to_category: {
        Row: {
          category_id: number
          id: number
          sort_order: number
          trackable_id: number
        }
        Insert: {
          category_id: number
          id?: never
          sort_order?: number
          trackable_id: number
        }
        Update: {
          category_id?: number
          id?: never
          sort_order?: number
          trackable_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_to_category_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "trackable_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trackable_to_category_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "daily_trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      wake_events: {
        Row: {
          detail: string | null
          duration_min: number | null
          event_count: number | null
          id: number
          sleep_entry_id: number
        }
        Insert: {
          detail?: string | null
          duration_min?: number | null
          event_count?: number | null
          id?: never
          sleep_entry_id: number
        }
        Update: {
          detail?: string | null
          duration_min?: number | null
          event_count?: number | null
          id?: never
          sleep_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "wake_events_sleep_entry_id_fkey"
            columns: ["sleep_entry_id"]
            isOneToOne: true
            referencedRelation: "sleep_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_entries: {
        Row: {
          body_md: string | null
          challenges: string | null
          created_at: string | null
          id: number
          next_week_focus: string | null
          reflection: string | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
          wins: string | null
        }
        Insert: {
          body_md?: string | null
          challenges?: string | null
          created_at?: string | null
          id?: never
          next_week_focus?: string | null
          reflection?: string | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
          wins?: string | null
        }
        Update: {
          body_md?: string | null
          challenges?: string | null
          created_at?: string | null
          id?: never
          next_week_focus?: string | null
          reflection?: string | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
          wins?: string | null
        }
        Relationships: []
      }
      weekly_intentions: {
        Row: {
          created_at: string | null
          id: number
          intention_text: string
          sort_order: number | null
          weekly_entry_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          intention_text: string
          sort_order?: number | null
          weekly_entry_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          intention_text?: string
          sort_order?: number | null
          weekly_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_intentions_weekly_entry_id_fkey"
            columns: ["weekly_entry_id"]
            isOneToOne: false
            referencedRelation: "weekly_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_journal_categories: {
        Row: {
          category_name: string
          id: number
          is_active: boolean
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          category_name: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          id?: never
          is_active?: boolean
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: []
      }
      weekly_journal_prompt_responses: {
        Row: {
          created_at: string | null
          id: number
          prompt_id: number
          response_text: string | null
          updated_at: string | null
          weekly_entry_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          prompt_id: number
          response_text?: string | null
          updated_at?: string | null
          weekly_entry_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          prompt_id?: number
          response_text?: string | null
          updated_at?: string | null
          weekly_entry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_journal_prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "weekly_journal_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_journal_prompt_responses_weekly_entry_id_fkey"
            columns: ["weekly_entry_id"]
            isOneToOne: false
            referencedRelation: "weekly_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_journal_prompts: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          is_active: boolean
          prompt_text: string
          protected: boolean
          sort_order: number | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: never
          is_active?: boolean
          prompt_text: string
          protected?: boolean
          sort_order?: number | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: never
          is_active?: boolean
          prompt_text?: string
          protected?: boolean
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_journal_prompts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "weekly_journal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_all_tables: {
        Args: { search_text: string }
        Returns: {
          match_count: number
          matching_column: string
          matching_table: string
        }[]
      }
    }
    Enums: {
      area_enum: "HOME" | "QUICKADD" | "DAILY"
      chart_type_enum:
        | "scatter"
        | "line"
        | "heatmap"
        | "timeline"
        | "bar"
        | "chain"
      media_status_type_enum:
        | "planned"
        | "in_progress"
        | "completed"
        | "abandoned"
      metric_role_enum: "x_axis" | "y_axis" | "series"
      module_enum:
        | "TASK_LIST"
        | "TASK_QUICKADD"
        | "TASK_ADD"
        | "APPOINTMENT_QUICKLIST"
        | "APPOINTMENT_ADD"
        | "APPOINTMENT_LIST"
        | "LAST_TIME"
        | "NOW_PLAYING_LIST"
        | "MEDIA_ADD"
        | "MEDIA_LIST"
        | "BRAIN_DUMP_ADD"
        | "BRAIN_DUMP_LIST"
        | "DAILY_JOURNAL"
        | "WEEKLY_JOURNAL"
        | "QUICK_LOG"
        | "PRESCRIPTION_LIST"
        | "PRESCRIPTION_ADD"
        | "PEOPLE_LIST"
        | "ANALYTICS_LIST"
      task_priority: "low" | "medium" | "high"
      task_status: "to-do" | "in-progress" | "done" | "cancelled"
      track_type_enum:
        | "numeric"
        | "boolean"
        | "aggregate"
        | "combo"
        | "time"
        | "choice"
        | "short_text"
        | "long_text"
        | "icon"
        | "tags"
        | "prescription"
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
    Enums: {
      area_enum: ["HOME", "QUICKADD", "DAILY"],
      chart_type_enum: [
        "scatter",
        "line",
        "heatmap",
        "timeline",
        "bar",
        "chain",
      ],
      media_status_type_enum: [
        "planned",
        "in_progress",
        "completed",
        "abandoned",
      ],
      metric_role_enum: ["x_axis", "y_axis", "series"],
      module_enum: [
        "TASK_LIST",
        "TASK_QUICKADD",
        "TASK_ADD",
        "APPOINTMENT_QUICKLIST",
        "APPOINTMENT_ADD",
        "APPOINTMENT_LIST",
        "LAST_TIME",
        "NOW_PLAYING_LIST",
        "MEDIA_ADD",
        "MEDIA_LIST",
        "BRAIN_DUMP_ADD",
        "BRAIN_DUMP_LIST",
        "DAILY_JOURNAL",
        "WEEKLY_JOURNAL",
        "QUICK_LOG",
        "PRESCRIPTION_LIST",
        "PRESCRIPTION_ADD",
        "PEOPLE_LIST",
        "ANALYTICS_LIST",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: ["to-do", "in-progress", "done", "cancelled"],
      track_type_enum: [
        "numeric",
        "boolean",
        "aggregate",
        "combo",
        "time",
        "choice",
        "short_text",
        "long_text",
        "icon",
        "tags",
        "prescription",
      ],
    },
  },
} as const
