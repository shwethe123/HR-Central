
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { AddWifiBillForm, type WifiBillFormData } from "./add-wifi-bill-form";
import { Wifi, PlusCircle, Loader2, CalendarDays, DollarSign, Info, FileText, Building, Server, UserCircle2, RefreshCw, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format as formatDateFns, differenceInDays, isToday, isFuture, isValid, formatDistanceToNowStrict, isPast, addMonths, addYears, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const WIFI_BILLS_FETCH_LIMIT = 50; // Increased limit for more data to test filtering

// Helper to format dates, handling both string and Firestore Timestamp
const formatDate = (dateInput: string | Timestamp | Date | undefined | null): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (dateInput instanceof Date && isValid(dateInput)) {
    date = dateInput;
  } else if (typeof dateInput === 'string') {
    try {
        date = parseISO(dateInput); 
    } catch (e) {
        console.warn("Invalid date string encountered:", dateInput, e);
        return 'Invalid Date String';
    }
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else {
    console.warn("Invalid date type encountered:", dateInput);
    return 'Invalid Date Type';
  }
  if (!isValid(date)) { 
    console.warn("Date resulted in NaN or is invalid:", dateInput);
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
  const [renewalInitialData, setRenewalInitialData] = useState<Partial<WifiBillFormData> | null>(null);
  const [dialogTitle, setDialogTitle] = useState("Add New WiFi Bill");

  // State for filters
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');


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
          title: "Bill List Might Be Truncated",
          description: `Showing up to ${WIFI_BILLS_FETCH_LIMIT} WiFi bills. Implement pagination or 'load more' for a full list if needed.`,
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
    setRenewalInitialData(null); 
    setDialogTitle("Add New WiFi Bill"); 
    fetchWifiBills(); 
    if (newBillId) {
        // Optionally, scroll to new bill or highlight
    }
  };

  const calculateNextDueDate = (currentDueDateStr: string | Date | Timestamp, cycle: WifiBill['paymentCycle']): Date => {
    let currentDueDate;
    if (currentDueDateStr instanceof Timestamp) {
        currentDueDate = currentDueDateStr.toDate();
    } else if (typeof currentDueDateStr === 'string') {
        currentDueDate = parseISO(currentDueDateStr);
    } else if (currentDueDateStr instanceof Date) {
        currentDueDate = currentDueDateStr;
    } else {
      currentDueDate = new Date(); 
    }

    if (!isValid(currentDueDate)) return new Date(); 

    switch (cycle) {
      case "Monthly":
        return addMonths(currentDueDate, 1);
      case "2 Months":
        return addMonths(currentDueDate, 2);
      case "Quarterly":
        return addMonths(currentDueDate, 3);
      case "Annually":
        return addYears(currentDueDate, 1);
      default: 
        return addMonths(currentDueDate, 1); 
    }
  };

  const handleOpenRenewDialog = (billToRenew: WifiBill) => {
    const nextDueDate = calculateNextDueDate(billToRenew.dueDate, billToRenew.paymentCycle);
    
    const initialDataForForm: Partial<WifiBillFormData> = {
        companyName: billToRenew.companyName,
        wifiProvider: billToRenew.wifiProvider,
        planName: billToRenew.planName,
        accountNumber: billToRenew.accountNumber || '',
        paymentCycle: billToRenew.paymentCycle,
        billAmount: billToRenew.billAmount,
        currency: billToRenew.currency || 'MMK',
        dueDate: nextDueDate, 
        paymentDate: null, 
        status: 'Pending',
        invoiceUrl: '', 
        notes: billToRenew.notes || '', 
    };
    setRenewalInitialData(initialDataForForm);
    setDialogTitle("Renew WiFi Bill");
    setIsFormDialogOpen(true);
  };

  const uniqueCompanies = useMemo(() => {
    return ['all', ...new Set(bills.map(bill => bill.companyName))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [bills]);

  const uniqueProviders = useMemo(() => {
    return ['all', ...new Set(bills.map(bill => bill.wifiProvider))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const companyMatch = selectedCompany === 'all' || bill.companyName === selectedCompany;
      const providerMatch = selectedProvider === 'all' || bill.wifiProvider === selectedProvider;
      return companyMatch && providerMatch;
    });
  }, [bills, selectedCompany, selectedProvider]);

  const displayBills = filteredBills; // Use filteredBills for rendering

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Wifi className="mr-3 h-8 w-8 text-primary" />
          WiFi Bill Management
        </h1>
        <Dialog 
            open={isFormDialogOpen} 
            onOpenChange={(isOpen) => {
                setIsFormDialogOpen(isOpen);
                if (!isOpen) {
                    setRenewalInitialData(null); 
                    setDialogTitle("Add New WiFi Bill"); 
                }
            }}
        >
          <DialogTrigger asChild>
            <Button 
                onClick={() => {
                    setRenewalInitialData(null); 
                    setDialogTitle("Add New WiFi Bill");
                }}
                disabled={isFormDialogOpen && dialogTitle === "Add New WiFi Bill"} 
            >
              {isFormDialogOpen && dialogTitle === "Add New WiFi Bill" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              Add New WiFi Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>
                {dialogTitle === "Renew WiFi Bill" ? "Confirm details for the renewal." : "Fill in the details for the new WiFi bill entry."}
              </DialogDescription>
            </DialogHeader>
            <AddWifiBillForm 
                key={renewalInitialData ? `renew-${renewalInitialData.dueDate?.toISOString()}` : 'new-bill'}
                onFormSubmissionSuccess={handleFormSubmissionSuccess} 
                initialData={renewalInitialData || undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section */}
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary/80"/>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filter-company" className="text-sm font-medium">Company Name</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger id="filter-company" className="mt-1">
                <SelectValue placeholder="Filter by Company" />
              </SelectTrigger>
              <SelectContent>
                {uniqueCompanies.map(company => (
                  <SelectItem key={company} value={company}>
                    {company === 'all' ? 'All Companies' : company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-provider" className="text-sm font-medium">WiFi Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="filter-provider" className="mt-1">
                <SelectValue placeholder="Filter by Provider" />
              </SelectTrigger>
              <SelectContent>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider === 'all' ? 'All Providers' : provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading WiFi bills...</p>
        </div>
      ) : displayBills.length === 0 ? (
        <Card className="text-center py-10 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
                {bills.length === 0 ? "No WiFi Bills Found" : "No Bills Match Your Filters"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {bills.length === 0 
                ? "Get started by adding your first WiFi bill record." 
                : "Try adjusting your filter criteria or add a new bill."}
            </p>
            <Button 
                onClick={() => {
                    setRenewalInitialData(null);
                    setDialogTitle("Add New WiFi Bill");
                    setIsFormDialogOpen(true);
                }} 
                disabled={isFormDialogOpen && dialogTitle === "Add New WiFi Bill"}
            >
                {isFormDialogOpen && dialogTitle === "Add New WiFi Bill" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                )}
                 Add New WiFi Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayBills.map((bill) => {
            const now = new Date();
            let dueDateInfoText = '';
            let paymentDateInfoText = '';
            let dueDateIconColor = 'text-gray-500'; 

            const billDueDateObj = bill.dueDate instanceof Timestamp ? bill.dueDate.toDate() : (typeof bill.dueDate === 'string' ? parseISO(bill.dueDate) : null);
            const billPaymentDateObj = bill.paymentDate ? (bill.paymentDate instanceof Timestamp ? bill.paymentDate.toDate() : (typeof bill.paymentDate === 'string' ? parseISO(bill.paymentDate) : null)) : null;
            
            if (billDueDateObj && isValid(billDueDateObj)) {
              if (bill.status === 'Pending' || bill.status === 'Overdue') {
                const daysDiff = differenceInDays(billDueDateObj, now);
                if (isToday(billDueDateObj)) {
                  dueDateInfoText = '(Due today)';
                  dueDateIconColor = 'text-orange-500';
                } else if (isFuture(billDueDateObj)) {
                  dueDateInfoText = `(Due in ${daysDiff +1} day${daysDiff + 1 !== 1 ? 's' : ''})`;
                  dueDateIconColor = 'text-blue-500';
                } else { 
                  const overdueDays = differenceInDays(now, billDueDateObj);
                  dueDateInfoText = `(Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''})`;
                  dueDateIconColor = 'text-red-500';
                }
              }
            }

            if (billPaymentDateObj && isValid(billPaymentDateObj) && bill.status === 'Paid') {
                paymentDateInfoText = `(${formatDistanceToNowStrict(billPaymentDateObj, { addSuffix: true })})`;
            }
            
            return (
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
                              "bg-gray-100 text-gray-700 border-gray-300" 
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
                      <CalendarDays className={`h-3.5 w-3.5 ${dueDateIconColor}`} />
                      <span className="font-medium">Due: {formatDate(billDueDateObj)}</span>
                      {dueDateInfoText && <span className="text-xs text-muted-foreground ml-1">{dueDateInfoText}</span>}
                  </div>
                  {billPaymentDateObj && bill.status === 'Paid' && (
                      <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-green-500" />
                          <span>Paid: {formatDate(billPaymentDateObj)}</span>
                          {paymentDateInfoText && <span className="text-xs text-muted-foreground ml-1">{paymentDateInfoText}</span>}
                      </div>
                  )}
                  {bill.notes && (
                      <div className="flex items-start gap-1.5 pt-1">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <p className="line-clamp-2 text-xs" title={bill.notes}>Notes: {bill.notes}</p>
                      </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-3 pb-3 flex flex-col items-stretch gap-2">
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
                  {bill.status !== "Cancelled" && (
                     <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => handleOpenRenewDialog(bill)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Renew Bill
                      </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
