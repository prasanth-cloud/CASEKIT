export type CaseIssueType =
  | "missing_delivery"
  | "damaged_item"
  | "refund_not_received"
  | "duplicate_charge"
  | "return_rejected"
  | "cancelled_order"
  | "poor_service";

export type CaseStatus =
  | "draft"
  | "processing"
  | "needs_review"
  | "draft_ready"
  | "approved"
  | "waiting_for_response"
  | "resolved"
  | "closed"
  | "blocked";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          country: string;
          marketing_consent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          country?: string;
          marketing_consent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          name?: string | null;
          country?: string;
          marketing_consent?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      cases: {
        Row: {
          id: string;
          user_id: string;
          merchant_name: string | null;
          issue_type: CaseIssueType | null;
          jurisdiction: string;
          status: CaseStatus;
          desired_resolution: string | null;
          confidence_score: number | null;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant_name?: string | null;
          issue_type?: CaseIssueType | null;
          jurisdiction?: string;
          status?: CaseStatus;
          desired_resolution?: string | null;
          confidence_score?: number | null;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
        Update: {
          merchant_name?: string | null;
          issue_type?: CaseIssueType | null;
          jurisdiction?: string;
          status?: CaseStatus;
          desired_resolution?: string | null;
          confidence_score?: number | null;
          updated_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      case_issue_type: CaseIssueType;
      case_status: CaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
