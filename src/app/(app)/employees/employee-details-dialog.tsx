
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '@/types';
import { format } from 'date-fns';

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-lg shadow-xl">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={employee.avatar || undefined} alt={employee.name} data-ai-hint="person avatar" />
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
      </DialogContent>
    </Dialog>
  );
}
