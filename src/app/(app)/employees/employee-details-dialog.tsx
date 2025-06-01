
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
    const margin = 4;

    // Colors
    const darkBlue = '#0A2240'; // Main background
    const accentBlue = '#00AEEF'; // Accent bar background
    const white = '#FFFFFF'; // Text on dark backgrounds
    const lightGray = '#D3D3D3'; // For role text or subtle text

    // Draw main background
    doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]); // Assuming hexToRgb or similar if not supported directly
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    // Draw accent bar (left side)
    const accentWidth = 26; // Width of the accent bar
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');

    // --- Left Accent Bar Content (Avatar & Company) ---
    const avatarSize = 18;
    const avatarX = (accentWidth - avatarSize) / 2;
    const avatarY = margin + 3;
    let avatarAdded = false;

    if (currentEmployee.avatar) {
      try {
        // Explicitly specify 'JPEG' for .jpg files from Firebase Storage
        // Ensure the image URL is accessible and CORS-enabled
        doc.addImage(currentEmployee.avatar, 'JPEG', avatarX, avatarY, avatarSize, avatarSize);
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

      doc.setFillColor(white[0], white[1], white[2]);
      doc.circle(circleX, circleYFallback, circleRadius, 'F');
      
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold'); // Default font (Helvetica) should be fine for English initials
      const initialsTextWidth = doc.getTextWidth(initials);
      doc.text(initials, circleX - initialsTextWidth / 2, circleYFallback + 3); // Adjust Y for vertical centering
    }
    
    let currentYAccent = avatarY + avatarSize + 6; // Space below avatar
    if (currentEmployee.company) {
      doc.setTextColor(white[0], white[1], white[2]);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal'); // Default font
      const companyText = currentEmployee.company;
      const companyTextMaxWidth = accentWidth - (margin); // Max width for company text
      const companyWrappedText = doc.splitTextToSize(companyText, companyTextMaxWidth);
      
      companyWrappedText.forEach((line: string, index: number) => {
        const lineWidth = doc.getTextWidth(line);
        const lineX = (accentWidth - lineWidth) / 2; // Center each line
        doc.text(line, lineX, currentYAccent + (index * 3.5)); // Adjust line height
      });
      currentYAccent += companyWrappedText.length * 3.5;
    }

    // --- Right Main Content Area ---
    let textX = accentWidth + margin;
    let textY = margin + 7; // Initial Y position for name
    const contentWidth = cardWidth - accentWidth - (margin * 1.5); // Width for content on the right

    // Employee Name
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(11); // Slightly smaller for better fit
    doc.setFont(undefined, 'bold'); // Default font
    const nameLines = doc.splitTextToSize(currentEmployee.name, contentWidth);
    nameLines.forEach((line: string, index: number) => {
        doc.text(line, textX, textY + (index * 4.5)); // Adjust line height
    });
    textY += (nameLines.length * 4.5) + 1; // Space after name

    // Role
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal'); // Default font
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    const roleLines = doc.splitTextToSize(currentEmployee.role || 'N/A', contentWidth);
    roleLines.forEach((line: string, index: number) => {
        doc.text(line, textX, textY + (index * 3.5)); // Adjust line height
    });
    textY += (roleLines.length * 3.5) + 3; // Space after role

    // Separator Line
    doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]); 
    doc.setLineWidth(0.3);
    doc.line(textX, textY, cardWidth - margin, textY);
    textY += 4; // Space after separator

    // Contact Details
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal'); // Default font
    doc.setTextColor(white[0], white[1], white[2]);
    
    const detailLineHeight = 3.8;
    const labelWidth = doc.getTextWidth("Department: ") + 1; // Calculate max label width for alignment

    const addDetailLine = (label: string, value: string | undefined | null) => {
        if (value && textY < (cardHeight - margin - 2)) { // Check if content fits
            const fullText = `${label} ${value}`;
            const textLines = doc.splitTextToSize(fullText, contentWidth);
            textLines.forEach((line: string, index: number) => {
                if (textY + (index * detailLineHeight) < (cardHeight - margin - 1)) {
                    doc.text(line, textX, textY + (index * detailLineHeight));
                }
            });
            textY += textLines.length * detailLineHeight;
        }
    };
    
    addDetailLine('Phone:', currentEmployee.phone);
    addDetailLine('Email:', currentEmployee.email);
    if (currentEmployee.department) { 
        addDetailLine('Dept:', currentEmployee.department);
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

