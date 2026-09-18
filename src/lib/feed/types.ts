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
};

export type FeedPost = {
  id: string;
  content: string | null;
  createdAt: string;
  author: FeedAuthor;
  attachments: FeedAttachment[];
  comments: FeedComment[];
  likesCount: number;
  likedByMe: boolean;
};
