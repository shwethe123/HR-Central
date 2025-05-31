
// src/app/(app)/employees/employee-details-dialog.tsx
"use client";

import type { Employee } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Printer, Mail, Phone, Briefcase, Building, DollarSign, CalendarDays, UserCheck, UserX, Tag, UserCircle2 } from "lucide-react";
import jsPDF from 'jspdf';

// Function to format date string if it's valid
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (e) {
    return "Invalid Date";
  }
};

const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Simplified Business Card PDF Generation Function
const handlePrintCardToPdf = (currentEmployee: Employee | null) => {
  if (!currentEmployee) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85, 55], // Standard business card size
  });

  const cardWidth = 85;
  const cardHeight = 55;
  const margin = 6; 

  const darkBlue = [10, 34, 64]; 
  const accentBlue = [0, 174, 239]; 
  const white = [255, 255, 255];
  const lightGray = [200, 200, 200]; // For less prominent text

  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, cardWidth, cardHeight, 'F');

  const accentWidth = 28;
  doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.rect(0, 0, accentWidth, cardHeight, 'F');

  const initials = currentEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const initialBoxSize = 18;
  const initialBoxX = (accentWidth - initialBoxSize) / 2;
  const initialBoxY = margin + 2;

  doc.setFillColor(white[0], white[1], white[2]);
  doc.rect(initialBoxX, initialBoxY, initialBoxSize, initialBoxSize, 'F');

  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const initialsTextWidth = doc.getTextWidth(initials);
  doc.text(initials, initialBoxX + (initialBoxSize - initialsTextWidth) / 2, initialBoxY + initialBoxSize / 2 + 3);

  let textY = initialBoxY + initialBoxSize + 7;
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8); // Slightly smaller for name to fit
  doc.setFont(undefined, 'bold');
  const nameLines = doc.splitTextToSize(currentEmployee.name, accentWidth - 4);
  doc.text(nameLines, (accentWidth - doc.getTextWidth(nameLines[0])) / 2, textY);
  textY += (nameLines.length * 3.5); // Adjust line height

  doc.setFontSize(6.5); // Smaller for role
  doc.setFont(undefined, 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  const roleLines = doc.splitTextToSize(currentEmployee.role, accentWidth - 4);
  doc.text(roleLines, (accentWidth - doc.getTextWidth(roleLines[0])) / 2, textY);


  let rightTextX = accentWidth + margin / 2;
  let rightTextY = margin + 2;

  doc.setTextColor(white[0], white[1], white[2]);

  doc.setFontSize(9); // Company name
  doc.setFont(undefined, 'bold');
  doc.text(currentEmployee.company || 'Company Name', rightTextX, rightTextY, { align: 'left' });
  rightTextY += 5;

  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(rightTextX, rightTextY, cardWidth - margin, rightTextY);
  rightTextY += 4;

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(white[0], white[1], white[2]);

  const contactDetails = [
    { icon: '\u{1F4DE}', text: currentEmployee.phone || 'N/A' }, // Phone
    { icon: '\u{2709}\u{FE0F}', text: currentEmployee.email },   // Email
    { icon: '\u{1F3E2}', text: currentEmployee.department }, // Department
    { icon: 'ID:', text: currentEmployee.employeeId },
  ];

  contactDetails.forEach(({ icon, text }) => {
    if (text) {
      const fullText = `${icon} ${text}`;
      const textLines = doc.splitTextToSize(fullText, cardWidth - accentWidth - margin - 2);
      doc.text(textLines, rightTextX, rightTextY);
      rightTextY += (textLines.length * 3.5); // Adjust line height
      if (rightTextY > cardHeight - margin) {
          rightTextY = cardHeight - margin;
      }
    }
  });

  doc.save(`Employee_Card_${currentEmployee.name.replace(/\s+/g, '_')}.pdf`);
};


interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange }: EmployeeDetailsDialogProps) {
  if (!employee) {
    return null;
  }

  const userAvatarFallback = employee.name?.substring(0, 2).toUpperCase() || "EM";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar || undefined} alt={employee.name} data-ai-hint="person avatar"/>
              <AvatarFallback className="text-xl">{userAvatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl font-semibold">{employee.name}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">{employee.role}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <DetailItem icon={Tag} label="Employee ID" value={employee.employeeId} />
          <DetailItem icon={Building} label="Company" value={employee.company || "N/A"} />
          <DetailItem icon={Briefcase} label="Department" value={employee.department} />
          <DetailItem icon={Mail} label="Email" value={employee.email} isLink={`mailto:${employee.email}`} />
          <DetailItem icon={Phone} label="Phone" value={employee.phone || "N/A"} isLink={employee.phone ? `tel:${employee.phone}` : undefined} />
          <DetailItem icon={CalendarDays} label="Start Date" value={formatDate(employee.startDate)} />
          <DetailItem icon={UserCircle2} label="Gender" value={employee.gender || "N/A"} />
          <DetailItem 
            icon={employee.status === "Active" ? UserCheck : UserX} 
            label="Status" 
            value={<Badge variant={employee.status === "Active" ? "default" : "destructive"} className={`font-semibold ${employee.status === "Active" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}`}>{employee.status}</Badge>} 
          />
          <DetailItem icon={DollarSign} label="Salary" value={formatCurrency(employee.salary)} />
        </div>

        <DialogFooter className="pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => handlePrintCardToPdf(employee)}>
            <Printer className="mr-2 h-4 w-4" /> Print Card PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for consistent detail item rendering
interface DetailItemProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  isLink?: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon: Icon, label, value, isLink }) => (
  <div className="flex items-start space-x-3 py-1">
    <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLink ? (
        <a href={isLink} className="text-sm text-foreground hover:underline hover:text-primary break-all" target="_blank" rel="noopener noreferrer">
          {value}
        </a>
      ) : (
        <p className="text-sm text-foreground break-words">{value}</p>
      )}
    </div>
  </div>
);

// Default export is not typically used with named imports, but if needed:
// export default EmployeeDetailsDialog; 
// However, since data-table.tsx uses `import { EmployeeDetailsDialog } ...`, a named export is sufficient.
// The `export function EmployeeDetailsDialog...` already makes it a named export.
