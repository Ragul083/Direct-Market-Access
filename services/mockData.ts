import { User, Crop, UserRole, ChartDataPoint, Conversation, Message, Notification } from '../types';

const USER_STORAGE_KEY = 'agrilink_users';
const NOTIF_STORAGE_KEY = 'agrilink_notifications';
const CROP_STORAGE_KEY = 'agrilink_crops';
const SESSION_STORAGE_KEY = 'agrilink_session'; // New key for active session

const defaultUsers: User[] = [
  { id: 'user-1', name: 'Rajesh Kumar', email: 'rajesh.k@gmail.com', password: 'password123', role: UserRole.FARMER, location: 'Nashik, Maharashtra', verified: true },
  { id: 'user-2', name: 'Priya Singh', email: 'priya.s@gmail.com', password: 'password123', role: UserRole.BUYER, location: 'Delhi Market, Delhi' },
  { id: 'user-3', name: 'Admin Manager', email: 'admin@gmail.com', password: 'password123', role: UserRole.ADMIN, location: 'Mumbai HQ' },
  { id: 'user-4', name: 'Anjali Desai', email: 'anjali.d@gmail.com', password: 'password123', role: UserRole.FARMER, location: 'Mysuru, Karnataka', verified: false },
];

const defaultNotifications: Notification[] = [
    { id: 'notif-1', userId: 'user-1', type: 'success', message: 'Your account has been successfully verified!', timestamp: Date.now() - 1000 * 60 * 5, read: false },
    { id: 'notif-2', userId: 'user-1', type: 'info', message: 'Priya Singh is interested in your Onions.', timestamp: Date.now() - 1000 * 60 * 60, read: true },
    { id: 'notif-3', userId: 'user-4', type: 'warning', message: 'Your farmer verification is still pending. Please complete your profile.', timestamp: Date.now() - 1000 * 60 * 60 * 24, read: false },
    { id: 'notif-4', userId: 'user-3', type: 'info', message: 'New farmer "Anjali Desai" requires verification.', timestamp: Date.now() - 1000 * 60 * 10, read: false },
];

const defaultCrops: Crop[] = [];

// --- DATABASE FUNCTIONS (Local Storage) ---

// Load users from local storage or use defaults
const loadUsers = (): User[] => {
    try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultUsers;
    } catch (e) {
        console.error("Failed to load users from local storage", e);
        return defaultUsers;
    }
};

export let mockUsers: User[] = loadUsers();

const saveUsers = () => {
    try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUsers));
    } catch (e) {
        console.error("Failed to save users to local storage", e);
    }
};

// Load notifications from local storage
const loadNotifications = (): Notification[] => {
    try {
        const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultNotifications;
    } catch (e) {
        console.error("Failed to load notifications", e);
        return defaultNotifications;
    }
};

export let mockNotifications: Notification[] = loadNotifications();

const saveNotifications = () => {
    try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(mockNotifications));
    } catch (e) {
        console.error("Failed to save notifications", e);
    }
};

// Load crops from local storage
const loadCrops = (): Crop[] => {
    try {
        const stored = localStorage.getItem(CROP_STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultCrops;
    } catch (e) {
        console.error("Failed to load crops", e);
        return defaultCrops;
    }
};

export let mockCrops: Crop[] = loadCrops();

const saveCrops = () => {
    try {
        localStorage.setItem(CROP_STORAGE_KEY, JSON.stringify(mockCrops));
    } catch (e) {
        console.error("Failed to save crops", e);
    }
};

// --- SESSION MANAGEMENT ---

export const persistLoginSession = (user: User) => {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user.id));
    } catch (e) {
        console.error("Failed to save session", e);
    }
};

export const clearLoginSession = () => {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear session", e);
    }
};

export const getPersistedSession = (): User | null => {
    try {
        const userId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (userId) {
            const parsedId = JSON.parse(userId);
            return mockUsers.find(u => u.id === parsedId) || null;
        }
    } catch (e) {
        console.error("Failed to restore session", e);
    }
    return null;
};


// --- API / HELPER FUNCTIONS ---

export const registerUser = (userData: Omit<User, 'id' | 'verified'>): { success: boolean, message: string } => {
  // Reload users to ensure we have latest data
  mockUsers = loadUsers(); 
  
  if (mockUsers.some(user => user.email === userData.email)) {
    return { success: false, message: 'An account with this email already exists.' };
  }
  const newUser: User = {
    ...userData,
    id: `user-${Date.now()}`,
    verified: userData.role === UserRole.FARMER ? false : undefined,
  };
  mockUsers.push(newUser);
  saveUsers(); // Persist to local storage

  // Generate notification for Admin
  const adminUser = mockUsers.find(u => u.role === UserRole.ADMIN);
  if (adminUser) {
    const notification: Notification = {
        id: `notif-${Date.now()}`,
        userId: adminUser.id,
        type: 'info',
        message: userData.role === UserRole.FARMER 
            ? `New farmer "${userData.name}" registered and requires verification.` 
            : `New buyer "${userData.name}" registered to the platform.`,
        timestamp: Date.now(),
        read: false
    };
    mockNotifications.push(notification);
    saveNotifications();
  }

  return { success: true, message: 'Registration successful! Please log in.' };
};

export const verifyUser = (userId: string): void => {
    const user = mockUsers.find(u => u.id === userId);
    if (user && user.role === UserRole.FARMER) {
        user.verified = !user.verified;
        saveUsers();
        
        // Notify the user
        const notification: Notification = {
            id: `notif-verify-${Date.now()}`,
            userId: userId,
            type: 'success',
            message: user.verified ? 'Your account has been verified!' : 'Your account verification has been revoked.',
            timestamp: Date.now(),
            read: false
        };
        mockNotifications.push(notification);
        saveNotifications();
    }
};

export const deleteUser = (userId: string): void => {
    const index = mockUsers.findIndex(u => u.id === userId);
    if (index > -1) {
        mockUsers.splice(index, 1);
        saveUsers();
    }
};

export const updateUser = (userId: string, updates: Partial<Pick<User, 'name' | 'location'>>): User | null => {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
        saveUsers(); // Persist to local storage
        return mockUsers[userIndex];
    }
    return null;
};

export const markNotificationRead = (id: string) => {
    const notif = mockNotifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveNotifications();
    }
};

export const markAllNotificationsRead = (userId: string) => {
    mockNotifications.forEach(n => {
        if (n.userId === userId) n.read = true;
    });
    saveNotifications();
};

export const notifyUserOfInterest = (targetUserId: string, buyerName: string, cropName: string) => {
    const notification: Notification = {
        id: `notif-interest-${Date.now()}`,
        userId: targetUserId,
        type: 'info',
        message: `Buyer "${buyerName}" is interested in your crop "${cropName}". Check your messages!`,
        timestamp: Date.now(),
        read: false
    };
    mockNotifications.push(notification);
    saveNotifications();
};

export const addCrop = (cropData: Omit<Crop, 'id' | 'uploadDate'>): Crop => {
    const newCrop: Crop = {
        ...cropData,
        id: `crop-${Date.now()}`,
        uploadDate: new Date().toISOString().split('T')[0],
        imageUrl: cropData.imageUrl || undefined // Allow undefined/empty images
    };
    mockCrops.push(newCrop);
    saveCrops();
    return newCrop;
};

export const getHistoricalPriceData = (cropName: string): ChartDataPoint[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Simulate different price patterns for different crops
  const basePrice = (cropName.length % 5) * 10 + 20; 
  return months.map((month, index) => ({
    month,
    price: parseFloat((basePrice + Math.sin(index) * (basePrice/2) + Math.random() * (basePrice/4)).toFixed(2)),
  }));
};

// Mock data for chat feature
export let mockConversations: Conversation[] = [
    {
        id: 'conv-1',
        participants: { 'user-2': 'Priya Singh', 'user-1': 'Rajesh Kumar' },
        lastMessage: 'Sure, I can have them ready by Friday.',
        lastMessageTimestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        unreadCount: 1,
    }
];

export let mockMessages: Message[] = [
    { id: 'msg-1', conversationId: 'conv-1', senderId: 'user-2', text: 'Namaste Rajesh ji, are the onions ready for pickup?', timestamp: Date.now() - 1000 * 60 * 60 * 3, type: 'text' },
    { id: 'msg-2', conversationId: 'conv-1', senderId: 'user-1', text: 'Namaste Priya ji! Almost, they are looking great.', timestamp: Date.now() - 1000 * 60 * 60 * 2.5, type: 'text' },
    { id: 'msg-3', conversationId: 'conv-1', senderId: 'user-1', text: 'Sure, I can have them ready by Friday.', timestamp: Date.now() - 1000 * 60 * 60 * 2, type: 'text' },
];