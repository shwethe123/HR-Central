
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
  displayOrder?: number; // New field for custom sorting
};

// New type for Resignation records
export type Resignation = {
  id: string;
  employeeId: string;
  employeeName: string;
  resignationDate: string; // The employee's last day
  noticeDate: string; // The day the employee gave notice
  reason?: string; // Reason for leaving
  rehireEligibility: "Eligible" | "Ineligible" | "Conditional";
  notes?: string; // HR notes
  createdAt: Timestamp; // When the record was created
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
  leaveType: "ကြိုတင်ခွင့်" | "အလုပ်နောက်ကျ" | "ခွင့်(နေမကောင်း)" | "ခွင့်ရက်ရှည်" | "ခွင့်မဲ့ပျက်" | "အပြစ်ပေး (ဖိုင်း)";
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
  senderPhotoURL?: string | null;
  text?: string; // Text is now optional
  createdAt: Timestamp;
  readAt?: Timestamp | null;
  messageType: 'text' | 'image' | 'file' | 'system'; // Added messageType, 'system' for future use
  fileURL?: string;
  fileName?: string;
  fileType?: string; // MIME type
  fileSize?: number; // in bytes
};

export type Team = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  memberNames?: string[];
  createdAt: Timestamp | string;
};

export type DocumentMetadata = {
  id: string;
  fileName: string;
  fileType: string; // MIME type e.g. application/pdf
  fileSize: number; // in bytes
  storagePath: string; // Path in Firebase Storage e.g. company-documents/uuid-filename.pdf
  downloadURL: string; // Publicly accessible download URL from Firebase Storage
  category: string; // e.g., "Policy", "Template", "Report"
  description?: string;
  uploadedByUid: string; // Firebase Auth UID of the uploader
  uploadedByName: string; // Display name of the uploader
  uploadedAt: Timestamp; // Firestore Timestamp
};

export type WifiBill = {
  id: string;
  companyName: "Innovatech Solutions" | "Synergy Corp" | "QuantumLeap Inc." | string; // Allow other company names too
  wifiProvider: "Myanmar Net" | "5BB" | "Ooredoo Fiber" | string; // Allow other providers
  planName: string; // e.g., "50Mbps Unlimited", "Business Plan A"
  accountNumber?: string;
  paymentCycle: "Monthly" | "2 Months" | "Quarterly" | "Annually";
  billAmount: number;
  currency?: "MMK" | "USD"; // Optional currency field, default to MMK if not specified elsewhere
  dueDate: string; // Could be Timestamp for more precise handling
  paymentDate?: string; // Optional, could be Timestamp
  status: "Pending" | "Paid" | "Overdue" | "Cancelled";
  notes?: string; // Optional notes
  createdAt: Timestamp; // When the bill record was created in the system
  updatedAt?: Timestamp; // When the bill record was last updated
};

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName?: string; // e.g., "HR Department", or specific admin name
  createdAt: Timestamp;
  publishedAt?: Timestamp; // For scheduling, optional for now
  status?: 'published' | 'draft'; // Optional for now, defaults to published
  updatedAt?: Timestamp;
}
