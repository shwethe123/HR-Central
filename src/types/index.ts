
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
  invoiceUrl?: string; // Optional link to the invoice PDF/image
  notes?: string; // Optional notes
  createdAt: Timestamp; // When the bill record was created in the system
  updatedAt?: Timestamp; // When the bill record was last updated
};
