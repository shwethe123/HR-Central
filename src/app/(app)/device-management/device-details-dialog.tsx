// src/app/(app)/device-management/device-details-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Smartphone } from '@/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Smartphone as SmartphoneIcon, Building, Briefcase, Calendar, Hash, Info, KeyRound, User, Mail, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface DeviceDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  device: Smartphone | null;
}

const formatDate = (dateInput: string | Timestamp | undefined): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else {
    return 'Invalid Date';
  }
  if (isNaN(date.getTime())) return 'Invalid Date';
  return format(date, "MMM d, yyyy");
};

const statusBadgeVariant = (status: Smartphone['status']) => {
  switch (status) {
    case 'Active': return 'default';
    case 'Damaged': return 'destructive';
    case 'Returned': return 'secondary';
    case 'Lost': return 'outline';
    default: return 'secondary' as 'default' | 'destructive' | 'secondary' | 'outline' | null | undefined;
  }
};

const DetailRow = ({ label, value, icon: Icon, children }: { label: string; value?: string | React.ReactNode; icon: React.ElementType, children?: React.ReactNode }) => (
  <div className="grid grid-cols-[30px_1fr] items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
    <div>
      <p className="font-semibold text-foreground">{label}</p>
      {value && <p className="text-muted-foreground text-sm">{value}</p>}
      {children}
    </div>
  </div>
);


const PasswordRow = ({ label, value }: { label: string, value: string }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
            <div>
                 <p className="text-xs font-medium text-muted-foreground">{label}</p>
                 <p className="font-mono text-sm">{show ? value : '••••••••'}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
            </Button>
        </div>
    );
};


export function DeviceDetailsDialog({ isOpen, onOpenChange, device }: DeviceDetailsDialogProps) {
  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SmartphoneIcon className="h-6 w-6 text-primary" />
            Device Details
          </DialogTitle>
          <DialogDescription>
            Full record for <strong>{device.phoneModel}</strong> assigned to <strong>{device.department}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <DetailRow label="Company" value={device.company} icon={Building} />
            <DetailRow label="Department" value={device.department} icon={Briefcase} />
            <DetailRow label="Phone Model" value={device.phoneModel} icon={SmartphoneIcon} />
            <DetailRow label="IMEI Number" value={device.imei || 'N/A'} icon={Hash} />
            <DetailRow label="Purchase Date" value={formatDate(device.purchaseDate)} icon={Calendar} />
            <DetailRow label="Issue Date" value={formatDate(device.issueDate)} icon={Calendar} />
            <DetailRow label="Status" icon={Info}>
                <Badge variant={statusBadgeVariant(device.status)} className="mt-1">{device.status}</Badge>
            </DetailRow>

            <Separator className="my-4" />

            <h4 className="font-semibold flex items-center gap-2 text-md"><KeyRound className="h-5 w-5 text-primary"/>Credentials</h4>

            {device.assignedAppName || device.assignedEmailAccount ? (
                <div className="space-y-4 pl-8">
                    {device.assignedAppName && (
                        <div className="space-y-2">
                             <DetailRow label="Application" value={device.assignedAppName} icon={User} />
                             {device.assignedAppUsername && <p className="text-sm text-muted-foreground -mt-2 ml-10">Username: {device.assignedAppUsername}</p>}
                             {device.assignedAppPassword && <PasswordRow label="App Password" value={device.assignedAppPassword} />}
                        </div>
                    )}
                    {(device.assignedAppName && device.assignedEmailAccount) && <Separator />}
                     {device.assignedEmailAccount && (
                        <div className="space-y-2">
                             <DetailRow label="Email Account" value={device.assignedEmailAccount} icon={Mail} />
                             {device.assignedEmailPassword && <PasswordRow label="Email Password" value={device.assignedEmailPassword} />}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground pl-8">No app or email credentials saved for this device.</p>
            )}

            <Separator className="my-4" />

            <DetailRow label="Notes" icon={Info}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{device.notes || 'No notes provided.'}</p>
            </DetailRow>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
