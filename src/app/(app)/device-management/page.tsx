// src/app/(app)/device-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Smartphone, Employee } from "@/types";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddDeviceForm } from "./add-device-form";
import { EditDeviceForm } from "./edit-device-form";
import { deleteDevice } from "./actions";
import { Smartphone as SmartphoneIcon, PlusCircle, Loader2, MoreHorizontal, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';

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

export default function DeviceManagementPage() {
  const { isAdmin } = useAuth();
  const [devices, setDevices] = useState<Smartphone[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Smartphone | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Smartphone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const devicesQuery = query(collection(db, "smartphones"), orderBy("createdAt", "desc"));
      const employeesQuery = query(collection(db, "employees"), orderBy("name", "asc"));
      
      const [devicesSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(devicesQuery),
        getDocs(employeesQuery),
      ]);

      const fetchedDevices: Smartphone[] = devicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Smartphone));
      const fetchedEmployees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      
      setDevices(fetchedDevices);
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error fetching device data:", error);
      toast({ title: "Error", description: "Failed to fetch device or employee data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSuccess = () => {
    fetchData();
    setIsAddFormOpen(false);
    setIsEditFormOpen(false);
    setDeviceToEdit(null);
  };

  const handleEditClick = (device: Smartphone) => {
    setDeviceToEdit(device);
    setIsEditFormOpen(true);
  };

  const handleDeleteClick = (device: Smartphone) => {
    setDeviceToDelete(device);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    setIsDeleting(true);
    const result = await deleteDevice(deviceToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchData();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setDeviceToDelete(null);
    setIsDeleting(false);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <SmartphoneIcon className="mr-3 h-8 w-8 text-primary" />
          Device Management
        </h1>
        {isAdmin && (
          <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
            <DialogTrigger asChild>
              <Button disabled={employees.length === 0}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Device Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>Enter the details for the new smartphone asset.</DialogDescription>
              </DialogHeader>
              <AddDeviceForm employees={employees} onFormSubmissionSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Smartphone Asset List</CardTitle>
          <CardDescription>A record of all smartphones issued to employees.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Phone Model</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No device records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    devices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.employeeName}</TableCell>
                        <TableCell>{device.phoneModel}</TableCell>
                        <TableCell className="text-muted-foreground">{device.imei || 'N/A'}</TableCell>
                        <TableCell>{formatDate(device.issueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(device.status)}>{device.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEditClick(device)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDeleteClick(device)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form Dialog */}
      {deviceToEdit && (
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Device Record</DialogTitle>
              <DialogDescription>Update details for the device assigned to {deviceToEdit.employeeName}.</DialogDescription>
            </DialogHeader>
            <EditDeviceForm
              deviceToEdit={deviceToEdit}
              employees={employees}
              onFormSubmissionSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for the <strong>{deviceToDelete?.phoneModel}</strong> assigned to <strong>{deviceToDelete?.employeeName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
