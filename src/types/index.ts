export type Category = 'latest' | 'provincial' | 'specialized' | 'thematic' | 'prediction' | 'midterm' | 'final' | 'placeholder';

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
  username: string; // This will be the email for Firebase Auth
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
