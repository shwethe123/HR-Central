
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { WifiBill } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { AddWifiBillForm } from "./add-wifi-bill-form";
import { Wifi, PlusCircle, Loader2, CalendarDays, DollarSign, Info, FileText, ExternalLink, Building, Server, FileBadge, UserCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format as formatDateFns } from 'date-fns';

const WIFI_BILLS_FETCH_LIMIT = 20; // Limit for initial fetch

// Helper to format dates, handling both string and Firestore Timestamp
const formatDate = (dateInput: string | Timestamp | undefined | null): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    try {
        date = new Date(dateInput);
    } catch (e) {
        console.warn("Invalid date string encountered:", dateInput, e);
        return 'Invalid Date String';
    }
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) { 
    date = dateInput;
  }
   else {
    console.warn("Invalid date type encountered:", dateInput);
    return 'Invalid Date Type';
  }
  if (isNaN(date.getTime())) {
    console.warn("Date resulted in NaN:", dateInput);
    return 'Invalid Date';
  }
  return formatDateFns(date, "MMM d, yyyy");
};

const formatCurrency = (amount: number | undefined, currencyCode: string = "MMK"): string => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const statusBadgeVariant = (status: WifiBill['status']) => {
  switch (status) {
    case "Pending": return "outline";
    case "Paid": return "default";
    case "Overdue": return "destructive";
    case "Cancelled": return "secondary";
    default: return "secondary";
  }
};


export default function WifiBillsPage() {
  const [bills, setBills] = useState<WifiBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchWifiBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const billsCollectionRef = collection(db, "wifiBills");
      const q = query(billsCollectionRef, orderBy("dueDate", "desc"), limit(WIFI_BILLS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedBills: WifiBill[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as WifiBill));
      setBills(fetchedBills);

       if (querySnapshot.docs.length >= WIFI_BILLS_FETCH_LIMIT) {
        toast({
          title: "Bill List Truncated",
          description: `Showing the first ${WIFI_BILLS_FETCH_LIMIT} WiFi bills. Implement pagination or 'load more' for a full list.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching WiFi bills:", error);
      toast({
        title: "Error Fetching Bills",
        description: "Could not load WiFi bills from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWifiBills();
  }, [fetchWifiBills]);

  const handleFormSubmissionSuccess = (newBillId?: string) => {
    setIsFormDialogOpen(false);
    fetchWifiBills(); // Refresh the list after adding a new bill
    if (newBillId) {
        // Optionally, you could scroll to the new bill or highlight it
    }
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Wifi className="mr-3 h-8 w-8 text-primary" />
          WiFi Bill Management
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New WiFi Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New WiFi Bill</DialogTitle>
              <DialogDescription>
                Fill in the details for the new WiFi bill entry.
              </DialogDescription>
            </DialogHeader>
            <AddWifiBillForm onFormSubmissionSuccess={handleFormSubmissionSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading WiFi bills...</p>
        </div>
      ) : bills.length === 0 ? (
        <Card className="text-center py-10 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">No WiFi Bills Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first WiFi bill record.
            </p>
            <Button onClick={() => setIsFormDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New WiFi Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bills.map((bill) => (
            <Card key={bill.id} className="shadow-lg rounded-lg flex flex-col hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-semibold truncate leading-tight flex items-center" title={`${bill.companyName} - ${bill.wifiProvider}`}>
                        <Building className="mr-2 h-5 w-5 text-primary/80 shrink-0" /> 
                        <span className="truncate">{bill.companyName}</span>
                    </CardTitle>
                     <Badge 
                        variant={statusBadgeVariant(bill.status)}
                        className={`text-xs whitespace-nowrap capitalize shrink-0 font-medium ${
                            bill.status === "Paid" ? "bg-green-100 text-green-700 border-green-300" :
                            bill.status === "Overdue" ? "bg-red-100 text-red-700 border-red-300" :
                            bill.status === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                            "bg-gray-100 text-gray-700 border-gray-300" // Cancelled or other
                        }`}
                    >
                        {bill.status}
                    </Badge>
                </div>
                 <CardDescription className="text-sm text-muted-foreground flex items-center pt-1">
                    <Server className="mr-2 h-4 w-4 shrink-0" /> {bill.wifiProvider} - {bill.planName}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1.5 flex-grow pt-0 pb-3">
                {bill.accountNumber && (
                    <div className="flex items-center gap-1.5">
                        <UserCircle2 className="h-3.5 w-3.5" />
                        <span>Account: {bill.accountNumber}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground/90">{formatCurrency(bill.billAmount, bill.currency)}</span>
                    <span className="text-muted-foreground">({bill.paymentCycle})</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-medium">Due: {formatDate(bill.dueDate)}</span>
                </div>
                {bill.paymentDate && (
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-green-500" />
                        <span>Paid: {formatDate(bill.paymentDate)}</span>
                    </div>
                )}
                {bill.notes && (
                    <div className="flex items-start gap-1.5 pt-1">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p className="line-clamp-2 text-xs" title={bill.notes}>Notes: {bill.notes}</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3">
                {bill.invoiceUrl ? (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        asChild 
                        className="w-full"
                    >
                        <a href={bill.invoiceUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="mr-2 h-4 w-4" /> View Invoice
                        </a>
                    </Button>
                ) : (
                    <p className="text-xs text-muted-foreground italic w-full text-center">No invoice URL provided</p>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


    