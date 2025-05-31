
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
// jspdf-autotable is no longer used for the card design

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EmployeeDetailsDialog({ employee, isOpen, onOpenChange }: EmployeeDetailsDialogProps) {
  if (!employee) {
    return null;
  }

  const nameFallback = employee.name.substring(0, 2).toUpperCase();

  const handlePrintToPdf = (currentEmployee: Employee) => {
    if (!currentEmployee) return;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85, 55] // Standard business card size W x H
    });

    const cardWidth = 85;
    const cardHeight = 55;
    const margin = 5;

    // Colors (approximated)
    const darkBlueR = 10, darkBlueG = 34, darkBlueB = 64;     // #0A2240
    const lightBlueR = 0, lightBlueG = 174, lightBlueB = 239; // #00AEEF
    const whiteR = 255, whiteG = 255, whiteB = 255;
    const greyTextR = 224, greyTextG = 224, greyTextB = 224; // #E0E0E0

    // Main dark blue background
    doc.setFillColor(darkBlueR, darkBlueG, darkBlueB);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');

    // Light blue accent area on the left
    const accentWidth = cardWidth * 0.38; // Adjusted for balance
    doc.setFillColor(lightBlueR, lightBlueG, lightBlueB);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');

    // Placeholder for "logo" - employee initials in a square
    const logoSquareSize = accentWidth * 0.5;
    const logoX = (accentWidth - logoSquareSize) / 2;
    const logoY = margin * 1.5; // Position it a bit down from the top
    doc.setFillColor(darkBlueR + 10, darkBlueG + 10, darkBlueB + 10); // Slightly lighter dark blue
    doc.rect(logoX, logoY, logoSquareSize, logoSquareSize, 'F');

    doc.setFontSize(16);
    doc.setTextColor(whiteR, whiteG, whiteB);
    doc.setFont(undefined, 'bold');
    const initials = currentEmployee.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    const initialsWidth = doc.getTextWidth(initials);
    const textMetrics = doc.getTextDimensions(initials);
    doc.text(initials, logoX + (logoSquareSize - initialsWidth) / 2, logoY + logoSquareSize / 2 + (textMetrics.h / 3));


    // Text content area - starting X and Y
    let currentX = accentWidth + margin;
    let currentY = margin + 7; // Initial Y position for name

    // Employee Name
    doc.setFontSize(14);
    doc.setTextColor(whiteR, whiteG, whiteB);
    doc.setFont(undefined, 'bold');
    doc.text(currentEmployee.name, currentX, currentY, { maxWidth: cardWidth - accentWidth - margin * 2 });

    // Employee Role
    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(greyTextR, greyTextG, greyTextB);
    doc.setFont(undefined, 'normal');
    doc.text(currentEmployee.role, currentX, currentY, { maxWidth: cardWidth - accentWidth - margin * 2 });

    // Separator line (optional)
    currentY += 3;
    doc.setDrawColor(lightBlueR, lightBlueG, lightBlueB); // Use light blue for line
    doc.setLineWidth(0.3);
    doc.line(currentX, currentY, cardWidth - margin, currentY);

    currentY += 6; // Space before contact details

    // Contact Info
    doc.setFontSize(8);
    doc.setTextColor(whiteR, whiteG, whiteB);

    const phoneIcon = "\u{1F4DE}"; // 📞
    const emailIcon = "\u{2709}\u{FE0F}"; // ✉️
    const companyIcon = "\u{1F3E2}"; // 🏢
    const departmentIcon = "\u{1F4BC}"; // 💼 (Briefcase for department)
    
    const contactMaxWidth = cardWidth - accentWidth - margin * 1.5;

    if (currentEmployee.phone) {
        doc.text(`${phoneIcon} ${currentEmployee.phone}`, currentX, currentY, { maxWidth: contactMaxWidth });
        currentY += 5;
    }
    if (currentEmployee.email) {
        doc.text(`${emailIcon} ${currentEmployee.email}`, currentX, currentY, { maxWidth: contactMaxWidth });
        currentY += 5;
    }
    if (currentEmployee.company) {
        doc.text(`${companyIcon} ${currentEmployee.company}`, currentX, currentY, { maxWidth: contactMaxWidth });
        currentY += 5;
    }
    if (currentEmployee.department) {
        doc.text(`${departmentIcon} ${currentEmployee.department}`, currentX, currentY, { maxWidth: contactMaxWidth });
    }

    doc.save(`Employee_Card_${currentEmployee.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-lg shadow-xl">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={employee.avatar || undefined} alt={employee.name} data-ai-hint="person avatar"/>
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
            <a href={`mailto:${employee.email}`} className="text-primary hover:underline truncate" title={employee.email}>
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
            <Badge variant={employee.status === 'Active' ? 'default' : 'destructive'} className={`font-semibold ${employee.status === 'Active' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
              {employee.status}
            </Badge>
          </div>
          <div className="flex items-center">
            <span className="w-[130px] font-medium text-muted-foreground">Salary:</span>
            <span>
              {employee.salary ? employee.salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => handlePrintToPdf(employee)}>
            <Printer className="mr-2 h-4 w-4" /> Print to PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
