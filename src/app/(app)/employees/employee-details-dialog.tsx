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
import { format } from 'date-fns';
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

  const handlePrintToPdf = (currentEmployee: Employee) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85, 55], // Business card size
    });

    const cardWidth = 85;
    const cardHeight = 55;
    const margin = 6;

    // Define colors (RGB arrays)
    const darkBlue = [10, 34, 64]; // Example: A deep navy blue
    const accentBlue = [0, 174, 239]; // Example: A bright, vibrant blue
    const white = [255, 255, 255];
    const lightGray = [224, 224, 224]; // For less prominent text

    // Background
    doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    // Left Accent Bar (e.g., where a logo or initials might go)
    const accentWidth = 30; // Width of the accent bar
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.roundedRect(0, 0, accentWidth, cardHeight, 0, 0, 'F'); // No rounded corners for a bar

    // Placeholder for "Logo" or Initials in the accent bar
    const initials = currentEmployee.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    const circleRadius = 10;
    const circleX = accentWidth / 2;
    const circleY = cardHeight / 2;

    // Draw a white circle for initials background
    doc.setFillColor(white[0], white[1], white[2]);
    doc.circle(circleX, circleY, circleRadius, 'F');
    
    // Add Initials
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]); // Text color for initials
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const textWidth = doc.getTextWidth(initials);
    doc.text(initials, circleX - textWidth / 2, circleY + 3); // Adjust Y for vertical centering


    // Text Section (to the right of the accent bar)
    let textX = accentWidth + margin;
    let textY = margin + 2; // Start a bit from the top

    // Employee Name (Prominent)
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(currentEmployee.name, textX, textY);
    
    textY += 6; // Space below name

    // Role/Title
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(currentEmployee.role, textX, textY);

    textY += 3; // Space
    // Divider line
    doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.setLineWidth(0.4);
    doc.line(textX, textY, cardWidth - margin, textY); // Line from textX to right margin

    textY += 5; // Space below divider

    // Contact Details
    doc.setFontSize(8);
    doc.setTextColor(white[0], white[1], white[2]);

    const contactLines = [
      { icon: '📞', text: currentEmployee.phone },
      { icon: '✉️', text: currentEmployee.email },
      { icon: '🏢', text: currentEmployee.company },
      { icon: '💼', text: currentEmployee.department },
    ];

    contactLines.forEach(line => {
      if (line.text) {
        doc.text(`${line.icon}  ${line.text}`, textX, textY);
        textY += 5; // Space for next line
      }
    });
    
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
            <span>{format(new Date(employee.startDate), 'MMMM d, yyyy')}</span>
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
              {employee.salary
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
// Removed default export if it existed previously
// export default EmployeeDetailsDialog; // This line should not be present if using named export
