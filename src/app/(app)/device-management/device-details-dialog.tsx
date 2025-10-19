// src/app/(app)/device-management/device-details-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Smartphone } from '@/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Smartphone as SmartphoneIcon, Building, Briefcase, Calendar, Hash, Info, KeyRound, User, Mail, Eye, EyeOff, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon: React.ElementType }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        <div className="flex-grow">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="text-md font-medium text-foreground">{value}</div>
        </div>
    </div>
);

const PasswordRow = ({ label, value }: { label: string, value: string }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="flex justify-between items-center bg-background p-2 rounded-md border">
            <div>
                 <p className="text-xs font-medium text-muted-foreground">{label}</p>
                 <p className="font-mono text-sm">{show ? value : '••••••••'}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4 text-muted-foreground"/> : <Eye className="h-4 w-4 text-muted-foreground"/>}
            </Button>
        </div>
    );
};

export function DeviceDetailsDialog({ isOpen, onOpenChange, device }: DeviceDetailsDialogProps) {
  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl">
                <SmartphoneIcon className="h-6 w-6 text-primary" />
                <span>{device.phoneModel}</span>
            </div>
            <Badge variant={statusBadgeVariant(device.status)}>{device.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Detailed record for device assigned to the <strong>{device.department}</strong> department.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[65vh] pr-5 -mr-2">
            <div className="space-y-6 py-4">
                {/* Main Device Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <DetailItem label="Company" value={device.company} icon={Building} />
                    <DetailItem label="Department" value={device.department} icon={Briefcase} />
                    <DetailItem label="Phone Model" value={device.phoneModel} icon={SmartphoneIcon} />
                    <DetailItem label="IMEI Number" value={device.imei || 'N/A'} icon={Hash} />
                    <DetailItem label="Purchase Date" value={formatDate(device.purchaseDate)} icon={Calendar} />
                    <DetailItem label="Issue Date" value={formatDate(device.issueDate)} icon={Calendar} />
                </div>

                <Separator />

                {/* Credentials Section */}
                <div>
                    <h4 className="font-semibold flex items-center gap-2 text-md mb-3"><KeyRound className="h-5 w-5 text-primary"/>Credentials</h4>
                    {device.credentials && device.credentials.length > 0 ? (
                        <div className="space-y-3 rounded-lg bg-muted/40 p-4">
                            {device.credentials.map((cred) => (
                                <div key={cred.id} className="p-3 border rounded-md bg-card space-y-2">
                                    <p className="font-semibold text-sm">{cred.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" />{cred.username}</div>
                                    {cred.password && <PasswordRow label="Password" value={cred.password} />}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-center text-muted-foreground py-4 px-4 bg-muted/40 rounded-lg">
                            <p>No app or email credentials saved for this device.</p>
                        </div>
                    )}
                </div>

                {/* Notes Section */}
                <div>
                    <h4 className="font-semibold flex items-center gap-2 text-md mb-3"><FileText className="h-5 w-5 text-primary"/>Notes</h4>
                    <div className="p-4 rounded-lg bg-muted/40 text-sm text-foreground whitespace-pre-wrap min-h-[60px]">
                        {device.notes || <span className="text-muted-foreground">No additional notes provided.</span>}
                    </div>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}