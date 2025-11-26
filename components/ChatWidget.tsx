import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Conversation, Message } from '../types';
import { chatService } from '../services/chatService';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    initialTargetUserId: string | null;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose, currentUser, initialTargetUserId }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const getOtherParticipant = (conv: Conversation) => {
        const otherUserId = Object.keys(conv.participants).find(id => id !== currentUser.id);
        return { id: otherUserId, name: otherUserId ? conv.participants[otherUserId] : 'Unknown' };
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversations = useCallback(async () => {
        const convs = await chatService.getConversationsForUser(currentUser.id);
        setConversations(convs);
    }, [currentUser.id]);

    const fetchMessages = useCallback(async (convId: string) => {
        const msgs = await chatService.getMessagesForConversation(convId);
        setMessages(msgs);
        scrollToBottom();
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            fetchConversations();
            const interval = setInterval(async () => {
                await fetchConversations();
                if(selectedConversation){
                   await fetchMessages(selectedConversation.id);
                }
            }, 3000); // Poll for new messages/conversations every 3 seconds
            return () => clearInterval(interval);
        }
    }, [isOpen, fetchConversations, selectedConversation, fetchMessages]);

    useEffect(() => {
        if (selectedConversation) {
            setIsLoading(true);
            fetchMessages(selectedConversation.id).finally(() => setIsLoading(false));
        }
    }, [selectedConversation, fetchMessages]);
    
    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    useEffect(() => {
      const handleInitialTarget = async () => {
        if(initialTargetUserId && isOpen){
            const conversation = await chatService.startOrGetConversation(currentUser.id, initialTargetUserId);
            setSelectedConversation(conversation);
            await fetchConversations();
        }
      };
      handleInitialTarget();
    }, [initialTargetUserId, isOpen, currentUser.id, fetchConversations]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConversation(conv);
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        await chatService.sendMessage(selectedConversation.id, currentUser.id, newMessage);
        setNewMessage('');
        await fetchMessages(selectedConversation.id);
        await fetchConversations();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (selectedConversation) {
                    await chatService.sendAudioMessage(selectedConversation.id, currentUser.id, audioBlob);
                    await fetchMessages(selectedConversation.id);
                    await fetchConversations();
                }
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-[600px] h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 animate-fade-in-up">
            <header className="flex items-center justify-between p-3 border-b bg-orange-600 text-white rounded-t-lg">
                <h3 className="font-bold text-lg">{selectedConversation ? `Chat with ${getOtherParticipant(selectedConversation).name}` : 'Conversations'}</h3>
                <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">&times;</button>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-1/3 border-r overflow-y-auto">
                    {conversations.map(conv => (
                        <div key={conv.id} onClick={() => handleSelectConversation(conv)} className={`p-3 cursor-pointer hover:bg-gray-100 ${selectedConversation?.id === conv.id ? 'bg-orange-100' : ''}`}>
                            <p className="font-semibold text-gray-800">{getOtherParticipant(conv).name}</p>
                            <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                        </div>
                    ))}
                </aside>
                <main className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.senderId === currentUser.id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                            {msg.type === 'audio' && msg.audioUrl ? (
                                                <div className="flex items-center space-x-2">
                                                    <i className="fas fa-microphone"></i>
                                                    <audio controls src={msg.audioUrl} className="h-8 w-48" />
                                                </div>
                                            ) : (
                                                <p>{msg.text}</p>
                                            )}
                                            <p className={`text-xs mt-1 ${msg.senderId === currentUser.id ? 'text-green-100' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-3 border-t bg-white flex items-center gap-2">
                                <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                                    <input 
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        disabled={isRecording}
                                        className="flex-1 px-4 py-2 border rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isRecording || !newMessage.trim()}
                                        className="bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </form>
                                <button 
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    title={isRecording ? "Stop Recording" : "Send Voice Message"}
                                >
                                    <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white`}></i>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ChatWidget;