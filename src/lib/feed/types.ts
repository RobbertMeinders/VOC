export type FeedAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  // Alleen gevuld voor de post-auteur (PostCard linkt daarnaar) — de
  // reactie-auteur gebruikt dit type ook, maar wordt nergens doorgeklikt,
  // dus daar is deze kolom niet nodig en blijft hij leeg uit de query.
  slug: string;
  avatarUrl: string | null;
  // Idem: alleen voor de post-auteur daadwerkelijk gevuld uit de query (zie
  // queries.ts) — bepaalt of PostCard de naam nog als link rendert. Een
  // geanonimiseerd lid ("Verwijderd lid") mag nergens meer doorklikbaar zijn.
  anonymized: boolean;
};

export type FeedAttachment = {
  id: string;
  type: "image" | "pdf";
  fileName: string;
  url: string | null;
  // Alleen voor de mozaïek-preview in de feed (AttachmentCarousel) — de
  // lightbox en elke andere plek die het volledige bestand nodig heeft
  // gebruikt altijd `url`. Null voor bijlagen van vóór thumbnails bestonden,
  // of voor PDF's (die hebben nooit een thumbnail).
  thumbUrl: string | null;
};

export type FeedComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: FeedAuthor;
  likesCount: number;
  likedByMe: boolean;
};

export type FeedPostType = "vraag" | "aanbod" | "nieuws" | "overig" | "voorstellen";

// Naam van de meest recente liker + totaalaantal, voor "Robbert Meinders en
// 5 anderen" onder een bericht — het volledige overzicht komt pas on-demand
// (LikersOverlay) via getPostLikersAction.
export type LikeSummary = { topLikerName: string | null; count: number };

export type FeedPost = {
  id: string;
  content: string | null;
  type: FeedPostType | null;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  attachments: FeedAttachment[];
  comments: FeedComment[];
  likesCount: number;
  likedByMe: boolean;
  likeSummary: LikeSummary;
};
