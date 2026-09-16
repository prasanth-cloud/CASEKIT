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
export type DraftStatus = "generated" | "edited" | "approved" | "sent" | "archived";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      extracted_facts: {
        Row: {
          id: string; case_id: string; version: number; merchant: string | null; order_id: string | null; order_date: string | null;
          item_description: string | null; amount_paid: number | null; delivery_date: string | null; promised_date: string | null;
          issue_type: CaseIssueType | null; problem_description: string | null; customer_request: string | null; missing_information: Json;
          confidence: number | null; source_document_ids: string[]; schema_version: string; extracted_by: string; is_current: boolean; created_at: string;
        };
        Insert: {
          id?: string; case_id: string; version?: number; merchant?: string | null; order_id?: string | null; order_date?: string | null;
          item_description?: string | null; amount_paid?: number | null; delivery_date?: string | null; promised_date?: string | null;
          issue_type?: CaseIssueType | null; problem_description?: string | null; customer_request?: string | null; missing_information?: Json;
          confidence?: number | null; source_document_ids?: string[]; schema_version: string; extracted_by?: string; is_current?: boolean; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["extracted_facts"]["Insert"]>;
        Relationships: [];
      };
      drafts: {
        Row: {
          id: string; case_id: string; facts_version: number; version: number; subject: string; body: string; structured_content: Json;
          attachments: Json; evidence_claim_ids: string[]; merchant_source_ids: string[]; safety_result: Json; prompt_version: string;
          status: DraftStatus; approved_at: string | null; sent_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; case_id: string; facts_version: number; version?: number; subject: string; body: string; structured_content?: Json;
          attachments?: Json; evidence_claim_ids?: string[]; merchant_source_ids?: string[]; safety_result: Json; prompt_version: string;
          status?: DraftStatus; approved_at?: string | null; sent_at?: string | null; created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      audit_events: {
        Row: { id: string; user_id: string | null; case_id: string | null; actor_type: string; action: string; changes: Json; prompt_version: string | null; supporting_document_ids: string[]; created_at: string };
        Insert: { id?: string; user_id?: string | null; case_id?: string | null; actor_type: string; action: string; changes?: Json; prompt_version?: string | null; supporting_document_ids?: string[]; created_at?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      revise_case_facts: {
        Args: {
          p_case_id: string; p_expected_version: number; p_merchant: string; p_order_id: string; p_order_date: string | null;
          p_item_description: string; p_amount_paid: number | null; p_delivery_date: string | null; p_promised_date: string | null;
          p_issue_type: CaseIssueType | null; p_problem_description: string; p_customer_request: string;
        };
        Returns: Database["public"]["Tables"]["extracted_facts"]["Row"];
      };
      mark_case_ready_for_drafting: {
        Args: { p_case_id: string; p_expected_facts_version: number };
        Returns: Database["public"]["Tables"]["cases"]["Row"];
      };
      create_case_draft_version: {
        Args: {
          p_case_id: string; p_facts_version: number; p_expected_draft_version: number; p_subject: string; p_body: string;
          p_structured_content: Json; p_evidence_claim_ids: string[]; p_merchant_source_ids: string[]; p_safety_result: Json; p_prompt_version: string;
        };
        Returns: Database["public"]["Tables"]["drafts"]["Row"];
      };
      approve_case_draft: {
        Args: { p_case_id: string; p_draft_id: string; p_expected_draft_version: number };
        Returns: Database["public"]["Tables"]["drafts"]["Row"];
      };
    };
    Enums: { case_issue_type: CaseIssueType; case_status: CaseStatus; document_status: DocumentStatus; draft_status: DraftStatus };
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type ExtractedFactsRow = Database["public"]["Tables"]["extracted_facts"]["Row"];
export type DraftRow = Database["public"]["Tables"]["drafts"]["Row"];
export type AuditEventRow = Database["public"]["Tables"]["audit_events"]["Row"];
