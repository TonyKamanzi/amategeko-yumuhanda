/** Shared between the server storage layer and the client reviews UI. */
export type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ReviewInput = {
  name: string;
  rating: number;
  comment: string;
};

export type ReviewsResult = {
  reviews: Review[];
  average: number;
  total: number;
};
