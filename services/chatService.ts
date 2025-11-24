import { Conversation, Message, User, UserRole } from '../types';
import { mockConversations, mockMessages, mockUsers } from './mockData';

// Simulate a database/API for chat
export const chatService = {
  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    const userConversations = mockConversations.filter(c => c.participants[userId]);
    return userConversations.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  },

  async getMessagesForConversation(conversationId: string): Promise<Message[]> {
    const messages = mockMessages.filter(m => m.conversationId === conversationId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },

  async sendMessage(conversationId: string, senderId: string, text: string): Promise<Message> {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      text,
      timestamp: Date.now(),
    };
    
    mockMessages.push(newMessage);

    // Update conversation's last message
    conversation.lastMessage = text;
    conversation.lastMessageTimestamp = newMessage.timestamp;

    return newMessage;
  },

  async startOrGetConversation(currentUserId: string, targetUserId: string): Promise<Conversation> {
    const existingConversation = mockConversations.find(c => 
      c.participants[currentUserId] && c.participants[targetUserId]
    );

    if (existingConversation) {
      return existingConversation;
    }

    const currentUser = mockUsers.find(u => u.id === currentUserId);
    const targetUser = mockUsers.find(u => u.id === targetUserId);

    if (!currentUser || !targetUser) {
        throw new Error("User not found for creating conversation");
    }

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants: {
        [currentUserId]: currentUser.name,
        [targetUserId]: targetUser.name,
      },
      lastMessage: 'Conversation started.',
      lastMessageTimestamp: Date.now(),
      unreadCount: 0,
    };
    
    mockConversations.push(newConversation);

    // Simulate a reply
    setTimeout(() => {
        const welcomeMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            conversationId: newConversation.id,
            senderId: targetUserId,
            text: `Hi there! Thanks for reaching out. How can I help you with my ${targetUser.role === UserRole.FARMER ? 'produce' : 'request'}?`,
            timestamp: Date.now() + 1000,
        };
        mockMessages.push(welcomeMessage);
        newConversation.lastMessage = welcomeMessage.text;
        newConversation.lastMessageTimestamp = welcomeMessage.timestamp;
    }, 2000);


    return newConversation;
  },
};
