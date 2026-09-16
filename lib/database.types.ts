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

export type DocumentStatus = "uploaded" | "scanning" | "ready" | "failed" | "deleted";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; name: string | null; country: string; marketing_consent: boolean; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; name?: string | null; country?: string; marketing_consent?: boolean; created_at?: string; updated_at?: string };
        Update: { email?: string | null; name?: string | null; country?: string; marketing_consent?: boolean; updated_at?: string };
        Relationships: [];
      };
      cases: {
        Row: { id: string; user_id: string; merchant_name: string | null; issue_type: CaseIssueType | null; jurisdiction: string; status: CaseStatus; desired_resolution: string | null; confidence_score: number | null; created_at: string; updated_at: string; closed_at: string | null };
        Insert: { id?: string; user_id: string; merchant_name?: string | null; issue_type?: CaseIssueType | null; jurisdiction?: string; status?: CaseStatus; desired_resolution?: string | null; confidence_score?: number | null; created_at?: string; updated_at?: string; closed_at?: string | null };
        Update: { merchant_name?: string | null; issue_type?: CaseIssueType | null; jurisdiction?: string; status?: CaseStatus; desired_resolution?: string | null; confidence_score?: number | null; updated_at?: string; closed_at?: string | null };
        Relationships: [];
      };
      documents: {
        Row: { id: string; case_id: string; user_id: string; storage_path: string; file_type: string; file_hash: string; byte_size: number; status: DocumentStatus; redaction_status: string; retention_until: string | null; created_at: string; deleted_at: string | null };
        Insert: { id?: string; case_id: string; user_id: string; storage_path: string; file_type: string; file_hash: string; byte_size: number; status?: DocumentStatus; redaction_status?: string; retention_until?: string | null; created_at?: string; deleted_at?: string | null };
        Update: { storage_path?: string; file_type?: string; file_hash?: string; byte_size?: number; status?: DocumentStatus; redaction_status?: string; retention_until?: string | null; deleted_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { case_issue_type: CaseIssueType; case_status: CaseStatus; document_status: DocumentStatus };
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
