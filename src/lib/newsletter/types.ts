export type NewsletterTextBlock = {
  id: string;
  type: "text";
  title?: string;
  body: string;
};

export type NewsletterImageBlock = {
  id: string;
  type: "image";
  url: string;
  layout: "full" | "left" | "right";
  title?: string;
  body?: string;
};

export type NewsletterButtonBlock = {
  id: string;
  type: "button";
  label: string;
  url: string;
};

export type NewsletterDividerBlock = {
  id: string;
  type: "divider";
};

export type NewsletterBlock = NewsletterTextBlock | NewsletterImageBlock | NewsletterButtonBlock | NewsletterDividerBlock;

export const BLOCK_TYPE_LABELS: Record<NewsletterBlock["type"], string> = {
  text: "Tekst",
  image: "Afbeelding",
  button: "Knop",
  divider: "Scheidingslijn",
};
