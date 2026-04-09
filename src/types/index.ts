export type Category = 'latest' | 'provincial' | 'specialized' | 'thematic' | 'prediction' | 'exam' | 'placeholder';

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
  fullName?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
}

export interface RegistrationRequest {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
