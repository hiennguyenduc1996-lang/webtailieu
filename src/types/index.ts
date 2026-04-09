export type Category = 'latest' | 'provincial' | 'specialized' | 'thematic' | 'prediction' | 'placeholder';

export interface Document {
  id: string;
  title: string;
  author?: string;
  driveLink: string;
  thumbnailUrl: string;
  category: Category;
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
