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
import { DeviceDetailsDialog } from './device-details-dialog'; // New import
import { deleteDevice } from "./actions";
import { Smartphone as SmartphoneIcon, PlusCircle, Loader2, MoreHorizontal, Edit, Trash2, AlertTriangle, ListFilter, AppWindow, KeyRound, Mail, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // New state for details dialog
  const [deviceToEdit, setDeviceToEdit] = useState<Smartphone | null>(null);
  const [deviceToView, setDeviceToView] = useState<Smartphone | null>(null); // New state for device to view
  const [deviceToDelete, setDeviceToDelete] = useState<Smartphone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const uniqueCompanies = useMemo(() => {
    return ['all', ...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort((a,b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [employees]);

  const uniqueDepartments = useMemo(() => {
    const filteredEmployees = selectedCompany === 'all' 
      ? employees 
      : employees.filter(emp => emp.company === selectedCompany);
    
    return ['all', ...new Set(filteredEmployees.map(emp => emp.department))].filter(Boolean).sort((a,b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [employees, selectedCompany]);


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
  
  useEffect(() => {
    setSelectedDepartment('all');
  }, [selectedCompany]);

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const companyMatch = selectedCompany === 'all' || device.company === selectedCompany;
      const departmentMatch = selectedDepartment === 'all' || device.department === selectedDepartment;
      return companyMatch && departmentMatch;
    });
  }, [devices, selectedCompany, selectedDepartment]);


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
  
  const handleViewDetailsClick = (device: Smartphone) => {
    setDeviceToView(device);
    setIsDetailsOpen(true);
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
            <Label htmlFor="filter-department" className="text-sm font-medium">Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={selectedCompany === 'all' && uniqueDepartments.length <= 1}>
              <SelectTrigger id="filter-department" className="mt-1">
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                     {dept === 'all' ? 'All Departments' : dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Smartphone Asset List</CardTitle>
          <CardDescription>A record of all smartphones issued to departments.</CardDescription>
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
                    <TableHead>Company</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone Model</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                         {devices.length === 0 ? "No device records found." : "No records match the current filter."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.company || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{device.department}</TableCell>
                        <TableCell>{device.phoneModel}</TableCell>
                        <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                {device.credentials && device.credentials.length > 0 ? (
                                    <>
                                        <KeyRound className="h-4 w-4 text-blue-500" />
                                        <span>{device.credentials.length} credential(s)</span>
                                    </>
                                ) : (
                                    'N/A'
                                )}
                            </div>
                        </TableCell>
                        <TableCell>{formatDate(device.issueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(device.status)}>{device.status}</Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleViewDetailsClick(device)}>
                                  <FileText className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleEditClick(device)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDeleteClick(device)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {deviceToView && (
        <DeviceDetailsDialog 
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          device={deviceToView}
        />
      )}

      {deviceToEdit && (
        <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Device Record</DialogTitle>
              <DialogDescription>Update details for the device assigned to the {deviceToEdit.department} department.</DialogDescription>
            </DialogHeader>
            <EditDeviceForm
              deviceToEdit={deviceToEdit}
              employees={employees}
              onFormSubmissionSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for the <strong>{deviceToDelete?.phoneModel}</strong> assigned to the <strong>{deviceToDelete?.department}</strong> department? This action cannot be undone.
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
