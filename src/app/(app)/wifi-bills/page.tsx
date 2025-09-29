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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { AddWifiBillForm, type WifiBillFormData } from "./add-wifi-bill-form";
import { deleteWifiBill, type DeleteWifiBillFormState } from "./actions";
import { Wifi, PlusCircle, Loader2, CalendarDays, DollarSign, Building, Server, ListFilter, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format as formatDateFns, differenceInDays, isToday, isFuture, isValid, isPast, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

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
    default: return "secondary" as "default" | "destructive" | "secondary" | "outline" | null | undefined;
  }
};

export default function WifiBillsPage() {
  const { isAdmin } = useAuth();
  const [bills, setBills] = useState<WifiBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormDialogOpen, setIsAddFormDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDeleteId, setBillToDeleteId] = useState<string | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

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

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Wifi className="mr-3 h-8 w-8 text-primary" />
          WiFi Bill Management
        </h1>
        <Dialog open={isAddFormDialogOpen} onOpenChange={setIsAddFormDialogOpen}>
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
            <AddWifiBillForm key={'new-bill-form'} onFormSubmissionSuccess={handleAddFormSubmissionSuccess} />
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
      
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
            <CardTitle>All WiFi Bills</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading WiFi bills...</p>
            </div>
           ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Provider & Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            {bills.length === 0 ? "No WiFi bills found." : "No bills match your current filters."}
                        </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map(bill => {
                        const billDueDateObj = bill.dueDate instanceof Timestamp ? bill.dueDate.toDate() : (typeof bill.dueDate === 'string' ? parseISO(bill.dueDate) : null);
                        let dueDateColor = 'text-foreground';
                        if (bill.status === 'Pending' || bill.status === 'Overdue') {
                             if (billDueDateObj && isValid(billDueDateObj)) {
                                 if (isPast(billDueDateObj) && !isToday(billDueDateObj)) {
                                    dueDateColor = 'text-red-500 font-semibold';
                                } else if (isToday(billDueDateObj)) {
                                    dueDateColor = 'text-orange-500 font-semibold';
                                } else if(differenceInDays(billDueDateObj, new Date()) <= 7){
                                    dueDateColor = 'text-yellow-600';
                                }
                             }
                        }

                      return (
                      <TableRow key={bill.id}>
                        <TableCell>
                          <div className="font-medium flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>{bill.companyName}</div>
                        </TableCell>
                        <TableCell>
                            <div>{bill.wifiProvider}</div>
                            <div className="text-xs text-muted-foreground">{bill.planName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{formatCurrency(bill.billAmount, bill.currency)}</div>
                          <div className="text-xs text-muted-foreground">{bill.paymentCycle}</div>
                        </TableCell>
                        <TableCell className={dueDateColor}>{formatDate(billDueDateObj)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(bill.status)} className="capitalize">{bill.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteConfirmationDialog(bill.id)}
                                disabled={deleteState?.pending && billToDeleteId === bill.id}
                                title="Delete Bill"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
           )}
        </CardContent>
      </Card>


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