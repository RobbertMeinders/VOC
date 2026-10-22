// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Structured like the output of `supabase gen types typescript` so it can be
// swapped for a generated file later without touching call sites.

export type UserRole = "lid" | "bestuurslid" | "beheerder";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type FeedAttachmentType = "image" | "pdf";
export type ActivitySource = "voc" | "lid";
export type ActivityStatus = "pending" | "approved" | "rejected" | "cancelled";
export type FeedPostType = "vraag" | "aanbod" | "nieuws" | "overig" | "voorstellen";
export type FeedReportReason = "ongepast" | "spam" | "misleidend" | "anders";
export type FeedReportStatus = "open" | "afgehandeld";
export type CommissionApplicationStatus = "in_behandeling" | "goedgekeurd" | "afgewezen";

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
          avatar_thumb_url: string | null;
          slug: string;
          role: UserRole;
          is_active: boolean;
          show_email: boolean;
          show_phone: boolean;
          show_attended_activities: boolean;
          push_new_activity: boolean;
          push_activity_reminder: boolean;
          push_feed_comment: boolean;
          push_feed_mention: boolean;
          push_new_members: boolean;
          email_new_activity: boolean;
          email_activity_reminder: boolean;
          email_feed_comment: boolean;
          email_feed_mention: boolean;
          email_new_members: boolean;
          email_campaigns: boolean;
          email_digest_new_activity: boolean;
          email_digest_feed_comment: boolean;
          email_digest_feed_mention: boolean;
          deactivated_at: string | null;
          anonymized_at: string | null;
          auth_scrubbed_at: string | null;
          pending_avatar_cleanup: string | null;
          last_active_at: string | null;
          linkedin_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          bio: string | null;
          is_organization_account: boolean;
          publicly_visible: boolean;
          onboarding_dismissed_at: string | null;
          introduction_prompt_dismissed_at: string | null;
          welcome_dialog_dismissed_at: string | null;
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
          logo_thumb_url: string | null;
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
          membership_status: "prospect" | "lid" | "opgezegd" | "oud-lid";
          member_since: string | null;
          membership_end_date: string | null;
          created_by: string | null;
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
      // Opschoonbackfill (0163) van companies.slug: oude (willekeurige/id-
      // staart) slugs blijven hier staan en wijzen naar hun bedrijf, voor een
      // 308 vanaf een al extern gedeelde/ingebedde link (0162).
      company_slug_aliases: {
        Row: {
          id: string;
          slug: string;
          company_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_slug_aliases"]["Row"]> & {
          slug: string;
          company_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_slug_aliases"]["Row"]>;
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
          decision_reason: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_membership_requests"]["Row"]> & {
          company_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_membership_requests"]["Row"]>;
        Relationships: [];
      };
      company_billing_details: {
        Row: {
          company_id: string;
          same_as_visit_address: boolean;
          invoice_name: string | null;
          invoice_address: string | null;
          invoice_postal_code: string | null;
          invoice_city: string | null;
          invoice_country: string;
          vat_number: string | null;
          invoice_email: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_billing_details"]["Row"]> & {
          company_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_billing_details"]["Row"]>;
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
          expires_at: string | null;
          accepted_by: string | null;
          accepted_at: string | null;
          created_at: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          job_title: string | null;
          company_id: string | null;
          imported: boolean;
          last_sent_at: string | null;
          source: "nieuw_lid" | "bestaand_lid" | "collega";
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
          image_thumb_url: string | null;
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
      activity_slug_aliases: {
        Row: {
          id: string;
          slug: string;
          activity_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_slug_aliases"]["Row"]> & {
          slug: string;
          activity_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_slug_aliases"]["Row"]>;
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
          thumb_path: string | null;
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
          slug: string;
          title: string;
          subtitle: string | null;
          body: string;
          image_url: string | null;
          position: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["news_items"]["Row"]> & {
          slug: string;
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
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          notes: string | null;
          opted_out: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & {
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [];
      };
      contact_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contact_lists"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_lists"]["Row"]>;
        Relationships: [];
      };
      contact_list_profiles: {
        Row: { list_id: string; profile_id: string };
        Insert: { list_id: string; profile_id: string };
        Update: Partial<Database["public"]["Tables"]["contact_list_profiles"]["Row"]>;
        Relationships: [];
      };
      contact_list_contacts: {
        Row: { list_id: string; contact_id: string };
        Insert: { list_id: string; contact_id: string };
        Update: Partial<Database["public"]["Tables"]["contact_list_contacts"]["Row"]>;
        Relationships: [];
      };
      communication_recipient_lists: {
        Row: { communication_id: string; list_id: string };
        Insert: { communication_id: string; list_id: string };
        Update: Partial<Database["public"]["Tables"]["communication_recipient_lists"]["Row"]>;
        Relationships: [];
      };
      communication_recipient_profiles: {
        Row: { communication_id: string; profile_id: string };
        Insert: { communication_id: string; profile_id: string };
        Update: Partial<Database["public"]["Tables"]["communication_recipient_profiles"]["Row"]>;
        Relationships: [];
      };
      communication_recipient_contacts: {
        Row: { communication_id: string; contact_id: string };
        Insert: { communication_id: string; contact_id: string };
        Update: Partial<Database["public"]["Tables"]["communication_recipient_contacts"]["Row"]>;
        Relationships: [];
      };
      communication_contact_sends: {
        Row: {
          id: string;
          communication_id: string;
          contact_id: string;
          emailed_at: string | null;
          email_provider_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["communication_contact_sends"]["Row"]> & {
          communication_id: string;
          contact_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["communication_contact_sends"]["Row"]>;
        Relationships: [];
      };
      communication_deliveries: {
        Row: {
          id: string;
          communication_id: string;
          profile_id: string | null;
          contact_id: string | null;
          email: string;
          status: "wachten" | "verstuurd" | "mislukt" | "overgeslagen";
          failure_reason: string | null;
          attempt_id: string | null;
          provider_id: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["communication_deliveries"]["Row"]> & {
          communication_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["communication_deliveries"]["Row"]>;
        Relationships: [];
      };
      communication_send_attempts: {
        Row: {
          id: string;
          communication_id: string;
          kind: "eerste_verzending" | "nasturen" | "opnieuw_proberen";
          started_by: string | null;
          started_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["communication_send_attempts"]["Row"]> & {
          communication_id: string;
          kind: string;
        };
        Update: Partial<Database["public"]["Tables"]["communication_send_attempts"]["Row"]>;
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
          channel_inapp_allowed: boolean;
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
      notification_type_settings: {
        Row: {
          type: string;
          enabled: boolean;
          roles: UserRole[] | null;
          channel_inapp: boolean;
          channel_push: boolean;
          channel_email: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_type_settings"]["Row"]> & {
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_type_settings"]["Row"]>;
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
      push_daily_send_counts: {
        Row: {
          profile_id: string;
          send_date: string;
          count: number;
        };
        Insert: Partial<Database["public"]["Tables"]["push_daily_send_counts"]["Row"]> & {
          profile_id: string;
          send_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_daily_send_counts"]["Row"]>;
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
          logo_path: string | null;
          logo_thumb_path: string | null;
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
          privacy_content: string;
          show_testfase: boolean;
          signature_personal_name: string | null;
          signature_personal_role: string | null;
          signature_personal_phone: string | null;
          signature_personal_email: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Relationships: [];
      };
      message_templates: {
        Row: {
          key: string;
          sort_order: number;
          group_label: string;
          name: string;
          when_text: string;
          to_text: string;
          signature_type: "alg" | "pers";
          has_push: boolean;
          subject: string;
          body_html: string;
          cta_label: string;
          after_html: string;
          push_title: string | null;
          push_body: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["message_templates"]["Row"]> & { key: string };
        Update: Partial<Database["public"]["Tables"]["message_templates"]["Row"]>;
        Relationships: [];
      };
      testfase_feedback: {
        Row: {
          id: string;
          profile_id: string;
          type: "probleem" | "idee";
          message: string;
          page: string | null;
          user_agent: string | null;
          screen_width: number | null;
          screenshot_path: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["testfase_feedback"]["Row"]> & {
          profile_id: string;
          type: "probleem" | "idee";
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["testfase_feedback"]["Row"]>;
        Relationships: [];
      };
      board_positions: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          started_at: string;
          ended_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["board_positions"]["Row"]> & {
          profile_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["board_positions"]["Row"]>;
        Relationships: [];
      };
      commissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["commissions"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["commissions"]["Row"]>;
        Relationships: [];
      };
      commission_memberships: {
        Row: {
          id: string;
          commission_id: string;
          profile_id: string;
          joined_at: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["commission_memberships"]["Row"]> & {
          commission_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["commission_memberships"]["Row"]>;
        Relationships: [];
      };
      commission_applications: {
        Row: {
          id: string;
          commission_id: string;
          profile_id: string;
          status: CommissionApplicationStatus;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
          message: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["commission_applications"]["Row"]> & {
          commission_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["commission_applications"]["Row"]>;
        Relationships: [];
      };
      org_profile: {
        Row: {
          id: boolean;
          intro_text: string | null;
          mission_text: string | null;
          vision_text: string | null;
          header_image_path: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["org_profile"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["org_profile"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      // M8: maskeert companies.address/postal_code/latitude/longitude voor
      // wie geen lid van dit bedrijf of bestuur/beheer is en het bedrijf
      // show_address uit heeft staan. Was een view (0145), sinds 0158 een
      // security definer functie (Supabase-linter 0010, "Security Definer
      // View") — zelfde rijvorm/maskering, dus Returns is nog steeds de
      // companies-Row.
      companies_for_members: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["companies"]["Row"][];
      };
      generate_unique_company_slug: {
        Args: { p_name: string };
        Returns: string;
      };
      resolve_company_slug_alias: {
        Args: { p_slug: string };
        Returns: string | null;
      };
      // Statistieken-foutenrapport M12/M13: SQL-side aggregatie i.p.v. alle
      // rijen van een groeiende tabel naar de client halen (0160).
      get_post_view_counts: {
        Args: Record<string, never>;
        Returns: { post_id: string; views: number }[];
      };
      get_feed_comment_counts: {
        Args: Record<string, never>;
        Returns: { post_id: string; comment_count: number }[];
      };
      get_communication_delivery_stats: {
        Args: Record<string, never>;
        Returns: { communication_id: string; sent: number; failed: number; total: number }[];
      };
      get_registration_counts_by_profile: {
        Args: { p_since: string };
        Returns: { profile_id: string; registrations: number }[];
      };
      get_notification_type_counts: {
        Args: { p_start: string; p_end: string };
        Returns: { type: string; cnt: number }[];
      };
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
        // beheer bent — zie get_member_profile in die migratie. De buitenste
        // haakjes zijn nodig: `A & B[]` parseert als `A & (B[])`, niet als
        // `(A & B)[]` — zonder die haakjes resolvet indexeren (`[0]`) naar
        // alleen `B` (hier dus alleen de email/phone-velden).
        Returns: (Omit<Database["public"]["Tables"]["profiles"]["Row"], "email" | "phone"> & {
          email: string | null;
          phone: string | null;
        })[];
      };
      get_members_directory: {
        Args: Record<string, never>;
        Returns: (Omit<Database["public"]["Tables"]["profiles"]["Row"], "email" | "phone"> & {
          email: string | null;
          phone: string | null;
        })[];
      };
      get_activity_registration_export: {
        Args: { p_activity_id: string };
        Returns: { first_name: string; last_name: string; email: string; is_waitlisted: boolean; attended: boolean }[];
      };
      set_company_show_address: {
        Args: { p_company_id: string; p_visible: boolean };
        Returns: void;
      };
      set_company_primary_contact: {
        Args: { p_company_id: string; p_profile_id: string };
        Returns: void;
      };
      set_company_member_since: {
        Args: { p_company_id: string; p_date: string | null };
        Returns: void;
      };
      request_company_cancellation: {
        Args: { p_company_id: string; p_end_date: string };
        Returns: void;
      };
      board_cancel_company_membership: {
        Args: { p_company_id: string; p_end_date: string };
        Returns: void;
      };
      set_company_publicly_visible: {
        Args: { p_company_id: string; p_visible: boolean };
        Returns: void;
      };
      get_activity_registration_counts: {
        Args: Record<string, never>;
        Returns: { activity_id: string; registered_count: number }[];
      };
      delete_feed_post: {
        Args: { p_id: string };
        Returns: void;
      };
      get_feed_post_like_summaries: {
        Args: { p_post_ids: string[] };
        Returns: { post_id: string; likes_count: number; top_liker_first_name: string | null; top_liker_last_name: string | null }[];
      };
      get_feed_comment_like_counts: {
        Args: { p_comment_ids: string[] };
        Returns: { comment_id: string; likes_count: number }[];
      };
      get_companies_directory: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          slug: string;
          name: string;
          industry: string | null;
          city: string | null;
          logo_url: string | null;
          logo_thumb_url: string | null;
          tagline: string | null;
          latitude: number | null;
          longitude: number | null;
          show_address: boolean;
        }[];
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
          address: string | null;
          postal_code: string | null;
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
      cleanup_old_events: {
        Args: Record<string, never>;
        Returns: number;
      };
      delete_expired_invitations: {
        Args: Record<string, never>;
        Returns: number;
      };
      anonymize_expired_profiles: {
        Args: Record<string, never>;
        Returns: { profile_id: string; old_avatar_url: string | null }[];
      };
      process_company_membership_cancellations: {
        Args: Record<string, never>;
        Returns: { company_id: string; profiles_anonymized: number }[];
      };
      anonymize_profile_now: {
        Args: { p_id: string };
        Returns: { profile_id: string; old_avatar_url: string | null }[];
      };
      get_profiles_pending_auth_scrub: {
        Args: Record<string, never>;
        Returns: { profile_id: string; pending_avatar_cleanup: string | null }[];
      };
      mark_profiles_auth_scrubbed: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      mark_profiles_avatar_cleaned: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      force_logout_member: {
        Args: { p_id: string };
        Returns: void;
      };
      force_logout_all_members: {
        Args: { p_except_id?: string | null };
        Returns: void;
      };
      has_any_profiles: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_board: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_public_company: {
        Args: { p_company_id: string };
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
      get_pending_email_digest_notifications: {
        Args: { p_limit?: number };
        Returns: {
          notification_id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          email: string;
          created_at: string;
        }[];
      };
      claim_push_send_slot: {
        Args: { p_profile_id: string; p_type: string; p_daily_limit: number };
        Returns: boolean;
      };
      get_email_template: {
        Args: { p_key: string };
        Returns: { subject: string; body_html: string }[];
      };
      get_message_template: {
        Args: { p_key: string };
        Returns: {
          subject: string;
          body_html: string;
          cta_label: string;
          after_html: string;
          signature_type: string;
          push_title: string | null;
          push_body: string | null;
        }[];
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
      notify_report_resolved: {
        Args: { p_report_id: string; p_decision: string };
        Returns: undefined;
      };
      notify_activity_participants: {
        Args: { p_activity_id: string; p_type: string; p_title: string; p_body: string };
        Returns: { email: string; name: string }[];
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
      claim_newsletter_contact_recipients: {
        Args: { p_communication_id: string };
        Returns: { send_id: string; contact_id: string; email: string }[];
      };
      mark_newsletter_contact_sent: {
        Args: { p_send_id: string; p_provider_id?: string | null };
        Returns: undefined;
      };
      claim_newsletter_send: {
        Args: { p_communication_id: string };
        Returns: boolean;
      };
      claim_newsletter_deliveries: {
        Args: { p_communication_id: string; p_kind: string };
        Returns: { delivery_id: string; profile_id: string | null; contact_id: string | null; email: string; attempt_id: string }[];
      };
      mark_newsletter_delivery_sent: {
        Args: { p_delivery_id: string; p_provider_id?: string | null };
        Returns: undefined;
      };
      mark_newsletter_delivery_failed: {
        Args: { p_delivery_id: string; p_reason: string };
        Returns: undefined;
      };
      mark_newsletter_delivery_skipped: {
        Args: { p_delivery_id: string; p_reason: string };
        Returns: undefined;
      };
      finalize_newsletter_send_v2: {
        Args: { p_communication_id: string };
        Returns: { total: number; sent: number; failed: number; skipped: number }[];
      };
    };
    Enums: {
      user_role: UserRole;
      invitation_status: InvitationStatus;
      feed_attachment_type: FeedAttachmentType;
    };
  };
}
