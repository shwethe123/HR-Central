
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Employee } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { Printer } from 'lucide-react';
import jsPDF from 'jspdf';

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Ensure this is a named export
export function EmployeeDetailsDialog({
  employee,
  isOpen,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  const nameFallback = employee.name.substring(0, 2).toUpperCase();

  const formatDateSafe = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      let dateObj = parseISO(dateString);
      if (!isValid(dateObj)) {
        dateObj = new Date(dateString);
      }
      if (isValid(dateObj)) {
        return format(dateObj, 'MMMM d, yyyy');
      }
      return 'Invalid Date';
    } catch (e) {
      return 'Invalid Date';
    }
  };


  const handlePrintToPdf = async (currentEmployee: Employee) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85, 55], // Business card size
    });

    const cardWidth = 85;
    const cardHeight = 55;
    const margin = 5; 

    const darkBlue = [10, 34, 64];
    const accentBlue = [0, 174, 239];
    const white = [255, 255, 255];
    const lightGray = [200, 200, 200]; 

    doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    const accentWidth = 28; 
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');

    const avatarSize = 20; 
    const avatarX = (accentWidth - avatarSize) / 2;
    const avatarY = margin + 2;

    let avatarAdded = false;
    if (currentEmployee.avatar) {
      try {
        // Let jsPDF auto-detect the image format by passing undefined or omitting the format.
        // It will attempt to infer from the data URI or file extension if it's a direct URL.
        // Common formats supported: JPEG, PNG. For others, conversion might be needed.
        doc.addImage(currentEmployee.avatar, undefined, avatarX, avatarY, avatarSize, avatarSize);
        avatarAdded = true;
      } catch (e: any) {
        console.error(`Error adding image to PDF (URL: ${currentEmployee.avatar}):`, e.message || e);
        // Fallback to initials if image fails
      }
    }

    if (!avatarAdded) {
      const initials = currentEmployee.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const circleRadius = avatarSize / 2;
      const circleX = accentWidth / 2;
      const circleYFallback = avatarY + circleRadius;

      doc.setFillColor(white[0], white[1], white[2]);
      doc.circle(circleX, circleYFallback, circleRadius, 'F');
      
      doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const initialsTextWidth = doc.getTextWidth(initials);
      doc.text(initials, circleX - initialsTextWidth / 2, circleYFallback + 3.5); // Adjusted Y for better vertical centering
    }
    
    if (currentEmployee.company) {
      doc.setTextColor(white[0], white[1], white[2]);
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      const companyText = currentEmployee.company;
      const companyTextMaxWidth = accentWidth - (margin / 2); // Max width for company text in accent bar
      const companyWrappedText = doc.splitTextToSize(companyText, companyTextMaxWidth);
      const companyTextX = (accentWidth - doc.getTextWidth(companyWrappedText[0])) / 2; // Center first line
      doc.text(companyWrappedText, companyTextX, avatarY + avatarSize + 6, { align: 'center' });
    }

    let textX = accentWidth + margin;
    let textY = margin + 5;

    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    const nameMaxWidth = cardWidth - accentWidth - (margin * 2);
    const nameText = doc.splitTextToSize(currentEmployee.name, nameMaxWidth);
    doc.text(nameText, textX, textY);
    
    textY += (nameText.length * 4.5); // Adjust based on number of lines for name

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    const roleText = doc.splitTextToSize(currentEmployee.role, nameMaxWidth);
    doc.text(roleText, textX, textY);

    textY += (roleText.length * 3.5) + 2; // Adjust based on number of lines for role, add small gap
    
    doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]); 
    doc.setLineWidth(0.3);
    doc.line(textX, textY, cardWidth - margin, textY);

    textY += 5;

    doc.setFontSize(7.5); 
    doc.setTextColor(white[0], white[1], white[2]);
    const iconTextGap = 1.5; 
    const lineHeight = 4.5;
    const contactMaxWidth = cardWidth - textX - margin - doc.getTextWidth('MM') - iconTextGap; // Reserve space for icons

    if (currentEmployee.phone) {
      doc.text('📱', textX, textY); 
      doc.text(doc.splitTextToSize(currentEmployee.phone, contactMaxWidth), textX + doc.getTextWidth('📱') + iconTextGap, textY);
      textY += lineHeight;
    }
    if (currentEmployee.email) {
      doc.text('📧', textX, textY); 
      doc.text(doc.splitTextToSize(currentEmployee.email, contactMaxWidth), textX + doc.getTextWidth('📧') + iconTextGap, textY);
      textY += lineHeight;
    }
    
    if (currentEmployee.department && textY < (cardHeight - margin - 2)) { // Check if space allows
      doc.text('💼', textX, textY); 
      doc.text(doc.splitTextToSize(currentEmployee.department, contactMaxWidth), textX + doc.getTextWidth('💼') + iconTextGap, textY);
      // textY += lineHeight; // No increment if it's the last item
    }

    doc.save(`Employee_Card_${currentEmployee.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-lg shadow-xl">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage
                src={employee.avatar || undefined}
                alt={employee.name}
                data-ai-hint="person avatar"
              />
              <AvatarFallback className="text-xl">{nameFallback}</AvatarFallback>
            </Avatar>
            <span className="text-2xl font-semibold">{employee.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-y-3 gap-x-4 py-4 px-6 text-sm">
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Employee ID:</span>
            <span>{employee.employeeId}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Company:</span>
            <span>{employee.company || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Department:</span>
            <span>{employee.department}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Role:</span>
            <span>{employee.role}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Gender:</span>
            <span>{employee.gender || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Email:</span>
            <a
              href={`mailto:${employee.email}`}
              className="text-primary hover:underline truncate"
              title={employee.email}
            >
              {employee.email}
            </a>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Phone:</span>
            <span>{employee.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Start Date:</span>
            <span>{formatDateSafe(employee.startDate)}</span>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Status:</span>
            <Badge
              variant={employee.status === 'Active' ? 'default' : 'destructive'}
              className={`font-semibold ${
                employee.status === 'Active'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-red-100 text-red-700 border-red-300'
              }`}
            >
              {employee.status}
            </Badge>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Salary:</span>
            <span>
              {employee.salary != null 
                ? employee.salary.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => handlePrintToPdf(employee)}>
            <Printer className="mr-2 h-4 w-4" />
            Print to PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
