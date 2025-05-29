
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
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp; // Always store as Timestamp, convert to Date on client
};
