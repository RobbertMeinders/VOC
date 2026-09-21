export type FeedAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
};

export type FeedAttachment = {
  id: string;
  type: "image" | "pdf";
  fileName: string;
  url: string | null;
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

export type FeedPostType = "vraag" | "aanbod" | "nieuws" | "overig";

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
