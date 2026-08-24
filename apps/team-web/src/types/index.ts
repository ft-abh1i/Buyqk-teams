export interface EmployeeProfile {
  uid: string;
  email: string;
  fullName: string;
  employeeId: string; // 3-digit code
  designation: string;
  department: string;
  phone: string;
  city: string;
  state: string;
  joiningDate: string;
  linkedin: string;
  github: string;
  portfolio: string;
  bio: string;
  skills: string[];
  languages: string[];
  experience: string;
  education: string;
  photoUrl: string;
  resumeUrl: string;
  resumeFileName?: string;
  status: 'pending' | 'approved' | 'disabled';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceState {
  online: boolean;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  edited?: boolean;
  pinned?: boolean;
  isCallRecord?: boolean;
  timestamp: number;
}

export interface DirectChat {
  id: string;
  participantUids: string[];
  lastMessage: string;
  lastMessageTime: number;
  unreadCount?: Record<string, number>;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  themeColor: string;
  department: string;
  members: Record<string, boolean>; // uid -> boolean
  createdBy: string;
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  important?: boolean;
}

export interface ActiveCallState {
  callId: string;
  type: 'audio' | 'video';
  chatId?: string;
  recipientName: string;
  recipientAvatar: string;
  recipientRole?: string;
  status: 'calling' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  durationSeconds: number;
  isMinimized: boolean;
}
