import { Conversation, Message, User, UserRole } from '../types';
import { mockConversations, mockMessages, mockUsers } from './mockData';
import { apiService } from './apiService';

// Chat service powered by Python backend with local fallback
export const chatService = {
  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    try {
      const serverConvs = await apiService.getConversations(userId);
      if (serverConvs && serverConvs.length > 0) {
        return serverConvs;
      }
    } catch (e) {
      console.warn('Using local conversations fallback:', e);
    }
    const userConversations = mockConversations.filter(c => c.participants[userId]);
    return userConversations.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  },

  async getMessagesForConversation(conversationId: string): Promise<Message[]> {
    try {
      const serverMsgs = await apiService.getMessages(conversationId);
      if (serverMsgs && serverMsgs.length > 0) {
        return serverMsgs;
      }
    } catch (e) {
      console.warn('Using local messages fallback:', e);
    }
    const messages = mockMessages.filter(m => m.conversationId === conversationId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },

  async sendMessage(conversationId: string, senderId: string, text: string): Promise<Message> {
    try {
      const serverMsg = await apiService.sendMessage(conversationId, senderId, text, 'text');
      if (serverMsg) {
        mockMessages.push(serverMsg);
        const conv = mockConversations.find(c => c.id === conversationId);
        if (conv) {
          conv.lastMessage = text;
          conv.lastMessageTimestamp = serverMsg.timestamp;
        }
        return serverMsg;
      }
    } catch (e) {
      console.warn('Using local send message fallback:', e);
    }

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
      type: 'text'
    };
    
    mockMessages.push(newMessage);

    // Update conversation's last message
    conversation.lastMessage = text;
    conversation.lastMessageTimestamp = newMessage.timestamp;

    return newMessage;
  },

  async sendAudioMessage(conversationId: string, senderId: string, audioBlob: Blob): Promise<Message> {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error('Conversation not found');

    // Convert Blob to Base64 Data URL
    const reader = new FileReader();
    const audioUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
    });

    try {
      const serverMsg = await apiService.sendMessage(conversationId, senderId, 'Voice Message', 'audio', audioUrl);
      if (serverMsg) {
        mockMessages.push(serverMsg);
        conversation.lastMessage = 'Voice Message';
        conversation.lastMessageTimestamp = serverMsg.timestamp;
        return serverMsg;
      }
    } catch (e) {
      console.warn('Using local send audio fallback:', e);
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      text: 'Voice Message',
      type: 'audio',
      audioUrl: audioUrl,
      timestamp: Date.now(),
    };

    mockMessages.push(newMessage);
    conversation.lastMessage = 'Voice Message';
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
            type: 'text'
        };
        mockMessages.push(welcomeMessage);
        newConversation.lastMessage = welcomeMessage.text;
        newConversation.lastMessageTimestamp = welcomeMessage.timestamp;
    }, 2000);


    return newConversation;
  },
};