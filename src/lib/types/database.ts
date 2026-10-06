// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Structured like the output of `supabase gen types typescript` so it can be
// swapped for a generated file later without touching call sites.

export type UserRole = "lid" | "bestuurslid" | "beheerder";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type FeedAttachmentType = "image" | "pdf";
export type ActivitySource = "voc" | "lid";
export type ActivityStatus = "pending" | "approved" | "rejected";
export type FeedPostType = "vraag" | "aanbod" | "nieuws" | "overig";
export type FeedReportReason = "ongepast" | "spam" | "misleidend" | "anders";
export type FeedReportStatus = "open" | "afgehandeld";

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
          show_attended_activities: boolean;
          push_activities: boolean;
          push_feed: boolean;
          push_new_members: boolean;
          email_activities: boolean;
          email_feed: boolean;
          email_new_members: boolean;
          email_campaigns: boolean;
          deactivated_at: string | null;
          anonymized_at: string | null;
          last_active_at: string | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          bio: string | null;
          is_organization_account: boolean;
          publicly_visible: boolean;
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
          show_address: boolean;
          phone: string | null;
          email: string | null;
          latitude: number | null;
          longitude: number | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          is_publicly_visible: boolean;
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
          rejection_reason: string | null;
          notify_push: boolean;
          notify_email: boolean;
          allow_public_registration: boolean;
          slug: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activities"]["Row"]> & {
          title: string;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
        Relationships: [];
      };
      public_activity_registrations: {
        Row: {
          id: string;
          activity_id: string;
          name: string;
          email: string;
          company_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["public_activity_registrations"]["Row"]> & {
          activity_id: string;
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["public_activity_registrations"]["Row"]>;
        Relationships: [];
      };
      prospects: {
        Row: {
          id: string;
          email: string;
          name: string;
          company_name: string | null;
          status: "nog_te_beoordelen" | "wil_lid_worden" | "wil_niet_lid_worden" | "geen_antwoord";
          status_note: string | null;
          first_seen_at: string;
          last_seen_at: string;
          status_updated_at: string | null;
          status_updated_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prospects"]["Row"]> & {
          email: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["prospects"]["Row"]>;
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
      feed_post_reports: {
        Row: {
          id: string;
          post_id: string;
          reporter_id: string;
          reason: FeedReportReason;
          details: string | null;
          status: FeedReportStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feed_post_reports"]["Row"]> & {
          post_id: string;
          reporter_id: string;
          reason: FeedReportReason;
        };
        Update: Partial<Database["public"]["Tables"]["feed_post_reports"]["Row"]>;
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
      news_items: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          body: string;
          image_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["news_items"]["Row"]> & {
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["news_items"]["Row"]>;
        Relationships: [];
      };
      communications: {
        Row: {
          id: string;
          type: string;
          subject: string;
          preheader: string | null;
          sender_name: string | null;
          status: string;
          content: unknown;
          template_key: string | null;
          linked_activity_id: string | null;
          recipient_filter: string;
          total_recipients: number | null;
          show_header: boolean;
          show_footer: boolean;
          scheduled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["communications"]["Row"]> & {
          subject: string;
        };
        Update: Partial<Database["public"]["Tables"]["communications"]["Row"]>;
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
          emailed_at: string | null;
          channel_push_allowed: boolean;
          channel_email_allowed: boolean;
          email_provider_id: string | null;
          communication_id: string | null;
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
          first_name: string | null;
          last_name: string | null;
          email: string;
          message: string | null;
          phone: string | null;
          company_name: string | null;
          job_title: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          website: string | null;
          consent_at: string | null;
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
      push_templates: {
        Row: {
          key: string;
          title: string;
          body: string;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["push_templates"]["Row"]> & {
          key: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_templates"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          event_type: string;
          profile_id: string | null;
          target_type: string | null;
          target_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          event_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          actor_id: string | null;
          target_type: string | null;
          target_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: boolean;
          site_name: string;
          org_name: string;
          logo_url: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
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
      get_activity_interest_count: {
        Args: { p_activity_id: string };
        Returns: number;
      };
      upsert_public_activity_registration: {
        Args: { p_activity_id: string; p_name: string; p_email: string; p_company_name: string | null };
        Returns: undefined;
      };
      get_member_profile: {
        Args: { p_id: string };
        // email/phone zijn hier nullable (i.t.t. profiles.Row): 0061_masked_
        // contact_fields.sql maskeert ze naar null tenzij het je eigen rij is,
        // de bekeken persoon show_email/show_phone aan heeft, of jij bestuur/
        // beheer bent — zie get_member_profile in die migratie.
        Returns: Omit<Database["public"]["Tables"]["profiles"]["Row"], "email" | "phone"> & {
          email: string | null;
          phone: string | null;
        }[];
      };
      get_members_directory: {
        Args: Record<string, never>;
        Returns: Omit<Database["public"]["Tables"]["profiles"]["Row"], "email" | "phone"> & {
          email: string | null;
          phone: string | null;
        }[];
      };
      set_company_show_address: {
        Args: { p_company_id: string; p_visible: boolean };
        Returns: void;
      };
      set_company_publicly_visible: {
        Args: { p_company_id: string; p_visible: boolean };
        Returns: void;
      };
      get_public_companies: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          tagline: string | null;
          industry: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
        }[];
      };
      get_public_company: {
        Args: { p_slug: string };
        Returns: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          tagline: string | null;
          description: string | null;
          industry: string | null;
          city: string | null;
          website: string | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          employees: { id: string; first_name: string; last_name: string; job_title: string | null; avatar_url: string | null }[];
        }[];
      };
      delete_expired_prospects: {
        Args: Record<string, never>;
        Returns: number;
      };
      anonymize_expired_profiles: {
        Args: Record<string, never>;
        Returns: { profile_id: string; old_avatar_url: string | null }[];
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
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        }[];
      };
      mark_notifications_pushed: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      get_pending_email_notifications: {
        Args: { p_limit?: number };
        Returns: {
          notification_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          email: string;
        }[];
      };
      mark_notifications_emailed: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      get_email_template: {
        Args: { p_key: string };
        Returns: { subject: string; body_html: string }[];
      };
      get_push_template: {
        Args: { p_key: string };
        Returns: { title: string; body: string }[];
      };
      list_push_subscriptions: {
        Args: Record<string, never>;
        Returns: { profile_id: string; endpoint: string; p256dh: string; auth: string; created_at: string }[];
      };
      record_manual_push_broadcast: {
        Args: { p_reached_profile_ids: string[]; p_dead_endpoints: string[]; p_title: string; p_body: string };
        Returns: undefined;
      };
      log_event: {
        Args: { p_event_type: string; p_target_type?: string | null; p_target_id?: string | null; p_metadata?: Record<string, unknown> };
        Returns: undefined;
      };
      log_audit_action: {
        Args: { p_action: string; p_target_type?: string | null; p_target_id?: string | null; p_metadata?: Record<string, unknown> };
        Returns: undefined;
      };
      log_notification_click: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      log_push_unsubscribed: {
        Args: { p_endpoint: string; p_profile_id?: string | null };
        Returns: undefined;
      };
      set_notification_email_provider_id: {
        Args: { p_notification_id: string; p_provider_id: string };
        Returns: undefined;
      };
      log_email_opened: {
        Args: { p_provider_id: string };
        Returns: undefined;
      };
      log_email_clicked: {
        Args: { p_provider_id: string; p_link?: string | null };
        Returns: undefined;
      };
      claim_newsletter_recipients: {
        Args: { p_communication_id: string };
        Returns: { notification_id: string; profile_id: string; email: string }[];
      };
      mark_newsletter_notification_sent: {
        Args: { p_notification_id: string; p_provider_id?: string | null };
        Returns: undefined;
      };
      finalize_newsletter_send: {
        Args: { p_communication_id: string };
        Returns: { total: number; sent: number }[];
      };
    };
    Enums: {
      user_role: UserRole;
      invitation_status: InvitationStatus;
      feed_attachment_type: FeedAttachmentType;
    };
  };
}
