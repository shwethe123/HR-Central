
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
  employeeName: string; // For convenience in display
  startDate: string; // Consider using Date objects in a real app
  endDate: string;   // Consider using Date objects in a real app
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedDate: string; // Date of submission
  // Optional fields for approval/rejection details
  processedBy?: string; // ID or name of manager/HR
  processedDate?: string;
  rejectionReason?: string; // If status is 'Rejected'
};
