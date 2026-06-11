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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          image_url: string
          link: string | null
          mundo: string | null
          ordem: number | null
          titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          image_url: string
          link?: string | null
          mundo?: string | null
          ordem?: number | null
          titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          image_url?: string
          link?: string | null
          mundo?: string | null
          ordem?: number | null
          titulo?: string | null
        }
        Relationships: []
      }
      brand_families: {
        Row: {
          brand_id: string
          created_at: string
          family_id: string
          id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          family_id: string
          id?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_families_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_families_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      catalog_customizations: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          reference_name: string
          type: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          reference_name: string
          type: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          reference_name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          mundo: string | null
          name: string
          ordem: number
          visivel: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          mundo?: string | null
          name: string
          ordem?: number
          visivel?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          mundo?: string | null
          name?: string
          ordem?: number
          visivel?: boolean
        }
        Relationships: []
      }
      contact_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      homepage_highlights: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          position: number
          ref_id: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          position?: number
          ref_id: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          position?: number
          ref_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_at: string
          fornecedor: string | null
          id: string
          price_new: number | null
          price_old: number | null
          purchase_price_new: number | null
          purchase_price_old: number | null
          raw: Json | null
          sku: string
        }
        Insert: {
          changed_at?: string
          fornecedor?: string | null
          id?: string
          price_new?: number | null
          price_old?: number | null
          purchase_price_new?: number | null
          purchase_price_old?: number | null
          raw?: Json | null
          sku: string
        }
        Update: {
          changed_at?: string
          fornecedor?: string | null
          id?: string
          price_new?: number | null
          price_old?: number | null
          purchase_price_new?: number | null
          purchase_price_old?: number | null
          raw?: Json | null
          sku?: string
        }
        Relationships: []
      }
      product_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string
        }
        Relationships: []
      }
      product_families: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          brand_id: string | null
          categoria_pai: string | null
          category: string | null
          conteudo_embalagem: string | null
          created_at: string
          description: string | null
          destaques: Json | null
          especificacoes: Json | null
          family: string | null
          family_id: string | null
          featured: boolean
          fornecedor: string | null
          id: string
          image_url: string | null
          include_in_catalog: boolean
          mundo: string | null
          name: string
          price: number | null
          produtos_relacionados: string[] | null
          purchase_price: number | null
          purchase_price_vat: number | null
          short_description: string | null
          show_on_homepage: boolean | null
          sku: string | null
          slug: string | null
          sob_encomenda: boolean | null
          stock_status: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          brand?: string | null
          brand_id?: string | null
          categoria_pai?: string | null
          category?: string | null
          conteudo_embalagem?: string | null
          created_at?: string
          description?: string | null
          destaques?: Json | null
          especificacoes?: Json | null
          family?: string | null
          family_id?: string | null
          featured?: boolean
          fornecedor?: string | null
          id?: string
          image_url?: string | null
          include_in_catalog?: boolean
          mundo?: string | null
          name: string
          price?: number | null
          produtos_relacionados?: string[] | null
          purchase_price?: number | null
          purchase_price_vat?: number | null
          short_description?: string | null
          show_on_homepage?: boolean | null
          sku?: string | null
          slug?: string | null
          sob_encomenda?: boolean | null
          stock_status?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          brand?: string | null
          brand_id?: string | null
          categoria_pai?: string | null
          category?: string | null
          conteudo_embalagem?: string | null
          created_at?: string
          description?: string | null
          destaques?: Json | null
          especificacoes?: Json | null
          family?: string | null
          family_id?: string | null
          featured?: boolean
          fornecedor?: string | null
          id?: string
          image_url?: string | null
          include_in_catalog?: boolean
          mundo?: string | null
          name?: string
          price?: number | null
          produtos_relacionados?: string[] | null
          purchase_price?: number | null
          purchase_price_vat?: number | null
          short_description?: string | null
          show_on_homepage?: boolean | null
          sku?: string | null
          slug?: string | null
          sob_encomenda?: boolean | null
          stock_status?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          status: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          items?: Json
          status?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          items?: Json
          status?: string
        }
        Relationships: []
      }
      shipping_config: {
        Row: {
          ativo: boolean | null
          fornecedor: string
          id: string
          preco_primeira_unidade: number | null
          preco_unidade_adicional: number | null
        }
        Insert: {
          ativo?: boolean | null
          fornecedor: string
          id?: string
          preco_primeira_unidade?: number | null
          preco_unidade_adicional?: number | null
        }
        Update: {
          ativo?: boolean | null
          fornecedor?: string
          id?: string
          preco_primeira_unidade?: number | null
          preco_unidade_adicional?: number | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
      app_role: ["super_admin", "admin"],
    },
  },
} as const
