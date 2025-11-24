import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ChatContextType {
  openChatWith: (userId: string | null) => void;
  targetUserId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const openChatWith = (userId: string | null) => {
    setTargetUserId(userId);
  };

  return (
    <ChatContext.Provider value={{ openChatWith, targetUserId }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
