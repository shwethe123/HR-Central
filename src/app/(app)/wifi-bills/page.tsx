
// src/app/(app)/wifi-bills/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useActionState, startTransition } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { AddWifiBillForm, type WifiBillFormData } from "./add-wifi-bill-form";
import { deleteWifiBill, type DeleteWifiBillFormState } from "./actions";
import { Wifi, PlusCircle, Loader2, CalendarDays, DollarSign, Info, FileText, Building, Server, ListFilter, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format as formatDateFns, differenceInDays, isToday, isFuture, isValid, formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const WIFI_BILLS_FETCH_LIMIT = 50;

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
  const [isAddFormDialogOpen, setIsAddFormDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDeleteId, setBillToDeleteId] = useState<string | null>(null);

  // State for filters
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  // Action state for delete
  const initialDeleteState: DeleteWifiBillFormState = { message: null, success: false };
  const [deleteState, deleteAction] = useActionState(deleteWifiBill, initialDeleteState);


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
          description: `Showing up to ${WIFI_BILLS_FETCH_LIMIT} WiFi bills.`,
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

  const handleAddFormSubmissionSuccess = (newBillId?: string) => {
    setIsAddFormDialogOpen(false);
    fetchWifiBills(); 
  };

  const openDeleteConfirmationDialog = (billId: string) => {
    setBillToDeleteId(billId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBill = () => {
    if (!billToDeleteId) return;
    const formData = new FormData();
    formData.append('billId', billToDeleteId);
    startTransition(() => {
      deleteAction(formData);
    });
  };

  useEffect(() => {
    if (deleteState?.success && deleteState.message) {
      toast({
        title: "Success",
        description: deleteState.message,
      });
      fetchWifiBills();
      setIsDeleteDialogOpen(false);
      setBillToDeleteId(null);
    } else if (!deleteState?.success && deleteState?.message) {
      toast({
        title: "Error Deleting Bill",
        description: deleteState.errors?._form?.[0] || deleteState.message,
        variant: "destructive",
      });
      // Optionally keep dialog open on error or close it:
      // setIsDeleteDialogOpen(false); 
      // setBillToDeleteId(null);
    }
  }, [deleteState, toast, fetchWifiBills]);


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

  const displayBills = filteredBills;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Wifi className="mr-3 h-8 w-8 text-primary" />
          WiFi Bill Management
        </h1>
        <Dialog 
            open={isAddFormDialogOpen} 
            onOpenChange={setIsAddFormDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New WiFi Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New WiFi Bill</DialogTitle>
              <DialogDescription>
                Fill in the details for the new WiFi bill entry.
              </DialogDescription>
            </DialogHeader>
            <AddWifiBillForm 
                key={'new-bill-form'} // Ensures form resets if it was used for editing/renewal before
                onFormSubmissionSuccess={handleAddFormSubmissionSuccess} 
            />
          </DialogContent>
        </Dialog>
      </div>

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
            <Button onClick={() => setIsAddFormDialogOpen(true)}>
                 <PlusCircle className="mr-2 h-4 w-4" />
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
                          <Trash2 className="h-3.5 w-3.5" /> {/* Placeholder, will be UserCircle2 */}
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
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => openDeleteConfirmationDialog(bill.id)}
                        disabled={deleteState?.pending && billToDeleteId === bill.id}
                      >
                        {deleteState?.pending && billToDeleteId === bill.id ? (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                           <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Bill
                      </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the WiFi bill record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBillToDeleteId(null)} disabled={deleteState?.pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBill} className="bg-destructive hover:bg-destructive/90" disabled={deleteState?.pending}>
              {deleteState?.pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
