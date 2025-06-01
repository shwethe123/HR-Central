
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
    const margin = 4; // Reduced margin slightly for more content space

    // Colors
    const darkBlue = '#0A2240'; // Hex for [10, 34, 64]
    const accentBlue = '#00AEEF'; // Hex for [0, 174, 239]
    const white = '#FFFFFF';
    const lightGray = '#CCCCCC';
    const textColorOnDark = white;
    const roleColor = lightGray;

    // Draw main background
    doc.setFillColor(darkBlue);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    // Draw accent bar
    const accentWidth = 26; // Adjusted accent width
    doc.setFillColor(accentBlue);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');

    // --- Left Accent Bar Content ---
    const avatarSize = 18; // Slightly smaller avatar
    const avatarX = (accentWidth - avatarSize) / 2;
    const avatarY = margin + 3;
    let avatarAdded = false;

    if (currentEmployee.avatar) {
      try {
        doc.addImage(currentEmployee.avatar, undefined, avatarX, avatarY, avatarSize, avatarSize);
        avatarAdded = true;
      } catch (e: any) {
        console.error(`Error adding image to PDF (URL: ${currentEmployee.avatar}). Error: ${e.message || e}. Falling back to initials.`);
        // Fallback to initials will happen outside this try-catch
      }
    }

    if (!avatarAdded) {
      const initials = currentEmployee.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const circleRadius = avatarSize / 2;
      const circleX = accentWidth / 2;
      const circleYFallback = avatarY + circleRadius;

      doc.setFillColor(white);
      doc.circle(circleX, circleYFallback, circleRadius, 'F');
      
      doc.setTextColor(darkBlue); // Dark blue initials on white circle
      doc.setFontSize(9); // Adjusted font size for initials
      doc.setFont(undefined, 'bold');
      const initialsTextWidth = doc.getTextWidth(initials);
      doc.text(initials, circleX - initialsTextWidth / 2, circleYFallback + 3); // Adjusted Y for better vertical centering
    }
    
    // Company Name in Accent Bar
    let currentYAccent = avatarY + avatarSize + 5; // Start Y below avatar
    if (currentEmployee.company) {
      doc.setTextColor(white);
      doc.setFontSize(6.5); // Slightly smaller font for company
      doc.setFont(undefined, 'bold');
      const companyText = currentEmployee.company;
      const companyTextMaxWidth = accentWidth - (margin / 2); 
      const companyWrappedText = doc.splitTextToSize(companyText, companyTextMaxWidth);
      
      // Calculate X to center each line of company text
      companyWrappedText.forEach((line: string, index: number) => {
        const lineWidth = doc.getTextWidth(line);
        const lineX = (accentWidth - lineWidth) / 2;
        doc.text(line, lineX, currentYAccent + (index * 3)); // 3mm line height
      });
      currentYAccent += companyWrappedText.length * 3;
    }


    // --- Right Main Content Area ---
    let textX = accentWidth + margin;
    let textY = margin + 7; // Initial Y for the name
    const contentWidth = cardWidth - accentWidth - (margin * 1.5); // Max width for content on the right

    // Employee Name
    doc.setTextColor(textColorOnDark);
    doc.setFontSize(12); // Larger font for name
    doc.setFont(undefined, 'bold');
    const nameLines = doc.splitTextToSize(currentEmployee.name, contentWidth);
    nameLines.forEach((line: string, index: number) => {
        doc.text(line, textX, textY + (index * 5)); // 5mm line height for name
    });
    textY += nameLines.length * 5;

    // Role
    doc.setFontSize(8.5); // Slightly smaller font for role
    doc.setFont(undefined, 'normal');
    doc.setTextColor(roleColor);
    const roleLines = doc.splitTextToSize(currentEmployee.role || 'N/A', contentWidth);
    roleLines.forEach((line: string, index: number) => {
        doc.text(line, textX, textY + (index * 3.5)); // 3.5mm line height
    });
    textY += (roleLines.length * 3.5) + 2; // Add a small gap after role

    // Separator Line
    doc.setDrawColor(accentBlue); 
    doc.setLineWidth(0.2);
    doc.line(textX, textY, cardWidth - margin, textY);
    textY += 3.5; // Space after separator

    // Contact Details
    doc.setFontSize(7);
    doc.setTextColor(textColorOnDark);
    const iconTextGap = 1.5; 
    const detailLineHeight = 3.5;
    const contactMaxWidth = contentWidth - doc.getTextWidth('MM') - iconTextGap; // Reserve space for icons

    const addDetailLine = (icon: string, detailText: string | undefined | null) => {
        if (detailText && textY < (cardHeight - margin - 2)) { // Check if space allows
            doc.text(icon, textX, textY, { charSpace: 0.5 }); // Added charSpace for emoji rendering
            const detailLines = doc.splitTextToSize(detailText, contactMaxWidth);
            detailLines.forEach((line: string, index: number) => {
                if (textY + (index * detailLineHeight) < (cardHeight - margin - 1)) {
                    doc.text(line, textX + doc.getTextWidth(icon) + iconTextGap, textY + (index * detailLineHeight));
                }
            });
            textY += detailLines.length * detailLineHeight;
        }
    };
    
    addDetailLine('📱', currentEmployee.phone);
    addDetailLine('📧', currentEmployee.email);
    addDetailLine('🏢', currentEmployee.department);
    // Add more details if needed and space permits
    // e.g., addDetailLine('💼', currentEmployee.company); // if company not in accent bar

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
