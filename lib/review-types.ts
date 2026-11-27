/** Shared between the server storage layer and the client reviews UI. */
export type Reply = {
  id: string;
  reviewId: string;
  name: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  /** True when the current visitor's saved token owns this reply. */
  owned: boolean;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  /** True when the current visitor's saved token owns this review. */
  owned: boolean;
  replies: Reply[];
};

export type ReviewInput = {
  name: string;
  rating: number;
  comment: string;
};

export type ReplyInput = {
  name: string;
  comment: string;
};

export type ReviewsResult = {
  reviews: Review[];
  /** Average of the top-level reviews returned in this response. */
  average: number;
  /** Total number of stored reviews (replies do not count). */
  total: number;
};

/** A browser-generated token stored in localStorage. It is never returned in
 *  GET responses; the server only sends it back when it creates one. */
export type OwnerTokenResult = {
  ownerToken: string;
};
