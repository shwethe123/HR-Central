
import type { Timestamp } from 'firebase/firestore';

export type Employee = {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  startDate: string;
  status: "Active" | "Inactive";
  avatar?: string;
  salary?: number;
  company?: string;
  gender?: "Male" | "Female" | "Other" | "Prefer not to say";
};

// New type for app users, mirroring essential Firebase Auth user info
// and adding lastSeen for presence.
export type AppUser = {
  uid: string; // Corresponds to Firebase Auth UID
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastSeen?: Timestamp; // Optional: to track user presence
};

export type Metric = {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  icon: React.ElementType;
};

export type FeedbackTheme = {
  theme: string;
  sentiment: string;
  examples: string[];
};

export type FeedbackAnalysisResult = {
  themes: FeedbackTheme[];
  suggestions: string[];
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedDate: Timestamp | string;
  processedBy?: string;
  processedDate?: Timestamp | string;
  rejectionReason?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null; // Added sender's photo URL
  text: string;
  createdAt: Timestamp;
  readAt?: Timestamp | null; // Field for read receipt
};

export type Team = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  memberNames?: string[];
  createdAt: Timestamp | string;
};

