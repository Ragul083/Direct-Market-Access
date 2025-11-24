export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  location: string;
  verified?: boolean; // For farmers
}

export interface Crop {
  id: string;
  farmerId: string;
  farmerName: string;
  name: string;
  variety: string;
  quantity: number; // in kg
  expectedPrice: number; // per kg
  imageUrl: string;
  location: string;
  uploadDate: string;
}

export interface ChartDataPoint {
  month: string;
  price: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number; // Using unix timestamp for easy sorting
}

export interface Conversation {
  id: string;
  participants: { [userId: string]: string }; // Map userId to userName
  lastMessage: string;
  lastMessageTimestamp: number;
  unreadCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning';
  message: string;
  timestamp: number;
  read: boolean;
}
