/**
 * Farmlink Frontend API Service
 * Connects directly to the Python backend (/api/*) with seamless local state fallback.
 */

import { User, Crop, Notification, Conversation, Message, ChartDataPoint } from '../types';
import { PricePrediction } from './geminiService';

const API_BASE = '/api';

export const apiService = {
  // Health check
  async getHealth(): Promise<{ status: string; backend: string; service: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API health check error:', e);
    }
    return null;
  },

  // Auth: Login
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  },

  // Auth: Register
  async register(payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    location: string;
    aadharNumber: string;
  }): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message, user: data.user };
      }
      return { success: false, message: data.error || 'Registration failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  },

  // Users Management (Admin)
  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch users from Python API:', e);
    }
    return [];
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) return data.user;
    } catch (e) {
      console.warn('Failed to update user via Python API:', e);
    }
    return null;
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.warn('Failed to delete user via Python API:', e);
      return false;
    }
  },

  // Crops Marketplace
  async getCrops(): Promise<Crop[]> {
    try {
      const res = await fetch(`${API_BASE}/crops`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch crops from Python API:', e);
    }
    return [];
  },

  async addCrop(cropData: Omit<Crop, 'id'>): Promise<Crop | null> {
    try {
      const res = await fetch(`${API_BASE}/crops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cropData),
      });
      const data = await res.json();
      if (res.ok && data.success) return data.crop;
    } catch (e) {
      console.warn('Failed to add crop via Python API:', e);
    }
    return null;
  },

  async deleteCrop(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/crops/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.warn('Failed to delete crop via Python API:', e);
      return false;
    }
  },

  async getCropHistory(cropName: string): Promise<ChartDataPoint[]> {
    try {
      const res = await fetch(`${API_BASE}/crops/history?crop=${encodeURIComponent(cropName)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch crop history from Python API:', e);
    }
    return [];
  },

  // AI Prediction & Market Intelligence
  async getPrediction(
    cropName: string,
    variety: string,
    quantity: number,
    location: string,
    language: string = 'en'
  ): Promise<PricePrediction | null> {
    try {
      const res = await fetch(`${API_BASE}/ai/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropName, variety, quantity, location, language }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to get AI prediction from Python backend:', e);
    }
    return null;
  },

  // Conversations & Chat
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const res = await fetch(`${API_BASE}/conversations?userId=${encodeURIComponent(userId)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch conversations from Python API:', e);
    }
    return [];
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch messages from Python API:', e);
    }
    return [];
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    type: 'text' | 'audio' = 'text',
    audioUrl?: string
  ): Promise<Message | null> {
    try {
      const res = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId, text, type, audioUrl: audioUrl || '' }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to send message via Python API:', e);
    }
    return null;
  },

  async initiateConversation(userA: { id: string; name: string }, userB: { id: string; name: string }, initialMessage: string = ''): Promise<{ id: string; participants: any } | null> {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userA, userB, initialMessage }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to initiate conversation via Python API:', e);
    }
    return null;
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch notifications from Python API:', e);
    }
    return [];
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      return res.ok;
    } catch (e) {
      console.warn('Failed to mark notification read via Python API:', e);
      return false;
    }
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to mark all notifications read via Python API:', e);
      return false;
    }
  },

  async notifyUser(userId: string, type: 'info' | 'success' | 'warning', message: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, message }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to send notification via Python API:', e);
      return false;
    }
  },

  // Admin Stats
  async getOverviewStats(): Promise<{
    totalUsers: number;
    farmers: number;
    buyers: number;
    pendingVerifications: number;
    totalListings: number;
    totalVolumeKg: number;
  } | null> {
    try {
      const res = await fetch(`${API_BASE}/stats/overview`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to get stats overview from Python API:', e);
    }
    return null;
  },
};
