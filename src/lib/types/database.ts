// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Structured like the output of `supabase gen types typescript` so it can be
// swapped for a generated file later without touching call sites.

export type UserRole = "lid" | "bestuurslid" | "beheerder";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type FeedAttachmentType = "image" | "pdf";
export type ActivitySource = "voc" | "lid";
export type ActivityStatus = "pending" | "approved" | "rejected";
export type FeedPostType = "vraag" | "aanbod" | "nieuws" | "overig";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          job_title: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          show_email: boolean;
          show_phone: boolean;
          last_active_at: string | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          tagline: string | null;
          industry: string | null;
          website: string | null;
          city: string | null;
          address: string | null;
          postal_code: string | null;
          phone: string | null;
          email: string | null;
          latitude: number | null;
          longitude: number | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["companies"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_members"]["Row"]> & {
          company_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_members"]["Row"]>;
        Relationships: [];
      };
      company_membership_requests: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          status: "pending" | "approved" | "rejected";
          requested_at: string;
          decided_by: string | null;
          decided_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_membership_requests"]["Row"]> & {
          company_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_membership_requests"]["Row"]>;
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          token: string;
          email: string | null;
          role: UserRole;
          invited_by: string | null;
          status: InvitationStatus;
          expires_at: string;
          accepted_by: string | null;
          accepted_at: string | null;
          created_at: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          job_title: string | null;
          company_id: string | null;
          imported: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          image_url: string | null;
          starts_at: string;
          ends_at: string | null;
          registration_deadline: string | null;
          max_participants: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          source: ActivitySource;
          status: ActivityStatus;
          external_registration_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["activities"]["Row"]> & {
          title: string;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
        Relationships: [];
      };
      activity_registrations: {
        Row: {
          id: string;
          activity_id: string;
          profile_id: string;
          is_waitlisted: boolean;
          attended: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_registrations"]["Row"]> & {
          activity_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_registrations"]["Row"]>;
        Relationships: [];
      };
      activity_attachments: {
        Row: {
          id: string;
          activity_id: string;
          storage_path: string;
          file_name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_attachments"]["Row"]> & {
          activity_id: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_attachments"]["Row"]>;
        Relationships: [];
      };
      feed_posts: {
        Row: {
          id: string;
          author_id: string;
          content: string | null;
          created_at: string;
          updated_at: string;
          type: FeedPostType | null;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_posts"]["Row"]> & {
          author_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_posts"]["Row"]>;
        Relationships: [];
      };
      feed_attachments: {
        Row: {
          id: string;
          post_id: string;
          type: FeedAttachmentType;
          storage_path: string;
          file_name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_attachments"]["Row"]> & {
          post_id: string;
          type: FeedAttachmentType;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_attachments"]["Row"]>;
        Relationships: [];
      };
      feed_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_comments"]["Row"]> & {
          post_id: string;
          author_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_comments"]["Row"]>;
        Relationships: [];
      };
      feed_likes: {
        Row: {
          id: string;
          post_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_likes"]["Row"]> & {
          post_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_likes"]["Row"]>;
        Relationships: [];
      };
      feed_comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_comment_likes"]["Row"]> & {
          comment_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_comment_likes"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          storage_path: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          title: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          pushed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          profile_id: string;
          type: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]> & {
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
        Relationships: [];
      };
      access_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string | null;
          phone: string | null;
          company_name: string | null;
          job_title: string | null;
          status: "pending" | "handled";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["access_requests"]["Row"]> & {
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["access_requests"]["Row"]>;
        Relationships: [];
      };
      email_templates: {
        Row: {
          key: string;
          subject: string;
          body_html: string;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["email_templates"]["Row"]> & {
          key: string;
          subject: string;
          body_html: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: {
          valid: boolean;
          role: UserRole;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          job_title: string | null;
          company_id: string | null;
          company_name: string | null;
          company_city: string | null;
        }[];
      };
      search_companies_for_signup: {
        Args: { p_query: string };
        Returns: { id: string; name: string; city: string | null }[];
      };
      has_any_profiles: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_board: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      create_activity_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_pending_push_notifications: {
        Args: { p_limit?: number };
        Returns: {
          notification_id: string;
          title: string;
          body: string | null;
          link: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
        }[];
      };
      mark_notifications_pushed: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      get_email_template: {
        Args: { p_key: string };
        Returns: { subject: string; body_html: string }[];
      };
    };
    Enums: {
      user_role: UserRole;
      invitation_status: InvitationStatus;
      feed_attachment_type: FeedAttachmentType;
    };
  };
}
