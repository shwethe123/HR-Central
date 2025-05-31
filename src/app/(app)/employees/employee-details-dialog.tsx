
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
      // Try parsing as ISO string first (common format)
      let dateObj = parseISO(dateString);
      if (!isValid(dateObj)) {
        // If ISO fails, try direct Date constructor (less reliable but fallback)
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
    const margin = 5; // Adjusted margin

    // Define colors (RGB arrays)
    const darkBlue = [10, 34, 64];
    const accentBlue = [0, 174, 239];
    const white = [255, 255, 255];
    const lightGray = [200, 200, 200]; // Lighter gray for subtle text

    // Background
    doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    // Left Accent Bar
    const accentWidth = 28; // Width of the accent bar
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');

    // Avatar / Initials in Accent Bar
    const avatarSize = 20; // Size of the avatar square/circle
    const avatarX = (accentWidth - avatarSize) / 2;
    const avatarY = margin + 2;

    let avatarAdded = false;
    if (currentEmployee.avatar) {
      try {
        // Add image directly from URL. jsPDF attempts to fetch it.
        // This works if the image is CORS-enabled or from the same origin.
        // For placehold.co, it usually works.
        // Note: Image format (JPEG/PNG) detection is automatic for common types.
        doc.addImage(currentEmployee.avatar, 'PNG', avatarX, avatarY, avatarSize, avatarSize);
        avatarAdded = true;
      } catch (e) {
        console.error("Error adding image to PDF, falling back to initials:", e);
        // Fallback to initials if image fails
      }
    }

    if (!avatarAdded) {
      // Fallback: Initials in a circle
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
      doc.text(initials, circleX - initialsTextWidth / 2, circleYFallback + 3); // Adjust Y for vertical centering
    }
    
    // Company Name in Accent Bar (below avatar/initials)
    if (currentEmployee.company) {
      doc.setTextColor(white[0], white[1], white[2]);
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      const companyText = currentEmployee.company;
      const companyTextWidth = doc.getTextWidth(companyText);
      // Center company text horizontally in accent bar
      const companyTextX = (accentWidth - companyTextWidth) / 2; 
      doc.text(companyText, companyTextX, avatarY + avatarSize + 6); // Position below avatar
    }


    // --- Right Text Section ---
    let textX = accentWidth + margin;
    let textY = margin + 5;

    // Employee Name (Prominent)
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(currentEmployee.name, textX, textY, { maxWidth: cardWidth - accentWidth - (margin * 2) });
    
    textY += 6;

    // Role/Title
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(currentEmployee.role, textX, textY, { maxWidth: cardWidth - accentWidth - (margin * 2) });

    textY += 4; 
    // Divider line
    doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]); // Use accent color for divider
    doc.setLineWidth(0.3);
    doc.line(textX, textY, cardWidth - margin, textY);

    textY += 5;

    // Contact Details
    doc.setFontSize(7.5); // Smaller font for contact details
    doc.setTextColor(white[0], white[1], white[2]);
    const iconTextGap = 1.5; // Gap between icon and text
    const lineHeight = 4.5;

    if (currentEmployee.phone) {
      doc.text('📱', textX, textY); // Phone icon
      doc.text(currentEmployee.phone, textX + doc.getTextWidth('📱') + iconTextGap, textY);
      textY += lineHeight;
    }
    if (currentEmployee.email) {
      doc.text('📧', textX, textY); // Email icon
      doc.text(currentEmployee.email, textX + doc.getTextWidth('📧') + iconTextGap, textY, { maxWidth: cardWidth - accentWidth - (margin * 2) - doc.getTextWidth('📧') - iconTextGap });
      textY += lineHeight;
    }
    // Department
    if (currentEmployee.department) {
      doc.text('💼', textX, textY); // Department/Work Icon
      doc.text(currentEmployee.department, textX + doc.getTextWidth('💼') + iconTextGap, textY);
      textY += lineHeight;
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
              {employee.salary != null // Check for null or undefined
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
