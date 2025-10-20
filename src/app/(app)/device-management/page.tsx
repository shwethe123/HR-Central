// src/app/(app)/device-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Smartphone, Employee, ComputerComponent } from "@/types";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddDeviceForm } from "./add-device-form";
import { EditDeviceForm } from "./edit-device-form";
import { DeviceDetailsDialog } from './device-details-dialog';
import { deleteDevice } from "./actions";
import { Smartphone as SmartphoneIcon, PlusCircle, Loader2, MoreHorizontal, Edit, Trash2, AlertTriangle, ListFilter, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// New imports for Computer Components
import { ComputerComponentForm } from "./computer-component-form";
import { ComputerComponentsTable } from "./computer-components-table";
import { deleteComputerComponent } from "./actions";
import { getComputerComponentColumns } from './computer-components-columns';

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
  const [smartphones, setSmartphones] = useState<Smartphone[]>([]);
  const [computerComponents, setComputerComponents] = useState<ComputerComponent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDeviceFormOpen, setIsAddDeviceFormOpen] = useState(false);
  const [isEditDeviceFormOpen, setIsEditDeviceFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Smartphone | null>(null);
  const [deviceToView, setDeviceToView] = useState<Smartphone | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Smartphone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // State for computer components
  const [isAddComponentFormOpen, setIsAddComponentFormOpen] = useState(false);
  const [isEditComponentFormOpen, setIsEditComponentFormOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState<ComputerComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<ComputerComponent | null>(null);

  // Filters for smartphones
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const devicesQuery = query(collection(db, "smartphones"), orderBy("createdAt", "desc"));
      const componentsQuery = query(collection(db, "computerComponents"), orderBy("createdAt", "desc"));
      const employeesQuery = query(collection(db, "employees"), orderBy("name", "asc"));
      
      const [devicesSnapshot, componentsSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(devicesQuery),
        getDocs(componentsQuery),
        getDocs(employeesQuery),
      ]);

      const fetchedDevices: Smartphone[] = devicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Smartphone));
      const fetchedComponents: ComputerComponent[] = componentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComputerComponent));
      const fetchedEmployees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      
      setSmartphones(fetchedDevices);
      setComputerComponents(fetchedComponents);
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

  // Smartphone filter logic
  const uniqueCompanies = useMemo(() => ['all', ...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort((a,b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b)), [employees]);
  const uniqueDepartments = useMemo(() => {
    const filteredEmployees = selectedCompany === 'all' ? employees : employees.filter(emp => emp.company === selectedCompany);
    return ['all', ...new Set(filteredEmployees.map(emp => emp.department))].filter(Boolean).sort((a,b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [employees, selectedCompany]);

  const filteredSmartphones = useMemo(() => {
    return smartphones.filter(device => {
      const companyMatch = selectedCompany === 'all' || device.company === selectedCompany;
      const departmentMatch = selectedDepartment === 'all' || device.department === selectedDepartment;
      return companyMatch && departmentMatch;
    });
  }, [smartphones, selectedCompany, selectedDepartment]);

  // Handlers for Smartphones
  const handleDeviceFormSuccess = () => { fetchData(); setIsAddDeviceFormOpen(false); setIsEditDeviceFormOpen(false); setDeviceToEdit(null); };
  const handleEditDeviceClick = (device: Smartphone) => { setDeviceToEdit(device); setIsEditDeviceFormOpen(true); };
  const handleViewDetailsClick = (device: Smartphone) => { setDeviceToView(device); setIsDetailsOpen(true); };
  const handleDeleteDeviceClick = (device: Smartphone) => { setDeviceToDelete(device); };
  const handleDeleteDeviceConfirm = async () => {
    if (!deviceToDelete) return;
    setIsDeleting(true);
    const result = await deleteDevice(deviceToDelete.id);
    if (result.success) { toast({ title: "Success", description: result.message }); fetchData(); } 
    else { toast({ title: "Error", description: result.message, variant: "destructive" }); }
    setDeviceToDelete(null);
    setIsDeleting(false);
  };
  
  // Handlers for Computer Components
  const handleComponentFormSuccess = () => { fetchData(); setIsAddComponentFormOpen(false); setIsEditComponentFormOpen(false); setComponentToEdit(null); };
  const handleEditComponentClick = (component: ComputerComponent) => { setComponentToEdit(component); setIsEditComponentFormOpen(true); };
  const handleDeleteComponentClick = (component: ComputerComponent) => { setComponentToDelete(component); };
  const handleDeleteComponentConfirm = async () => {
    if (!componentToDelete) return;
    setIsDeleting(true);
    const result = await deleteComputerComponent(componentToDelete.id);
    if (result.success) { toast({ title: "Success", description: result.message }); fetchData(); } 
    else { toast({ title: "Error", description: result.message, variant: "destructive" }); }
    setComponentToDelete(null);
    setIsDeleting(false);
  };

  const computerComponentColumns = useMemo(() => getComputerComponentColumns(employees, handleEditComponentClick, handleDeleteComponentClick, isAdmin), [employees, isAdmin]);

  return (
    <div className="container mx-auto py-2 space-y-6">
      <h1 className="text-3xl font-semibold flex items-center">
        <SmartphoneIcon className="mr-3 h-8 w-8 text-primary" />
        Device & Asset Management
      </h1>

      <Tabs defaultValue="smartphones" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smartphones"><SmartphoneIcon className="mr-2 h-4 w-4"/>Smartphones</TabsTrigger>
          <TabsTrigger value="components"><Cpu className="mr-2 h-4 w-4"/>Computer</TabsTrigger>
        </TabsList>
        <TabsContent value="smartphones">
          <Card className="shadow-lg rounded-lg mt-4">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Smartphone Asset List</CardTitle>
                    <CardDescription>A record of all smartphones issued to departments.</CardDescription>
                </div>
                 {isAdmin && (
                    <Dialog open={isAddDeviceFormOpen} onOpenChange={setIsAddDeviceFormOpen}>
                        <DialogTrigger asChild>
                        <Button disabled={employees.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Smartphone
                        </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New Smartphone</DialogTitle>
                            <DialogDescription>Enter the details for the new smartphone asset.</DialogDescription>
                        </DialogHeader>
                        <AddDeviceForm employees={employees} onFormSubmissionSuccess={handleDeviceFormSuccess} />
                        </DialogContent>
                    </Dialog>
                    )}
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                    <div>
                        <Label htmlFor="filter-company" className="text-sm font-medium">Company Name</Label>
                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger id="filter-company" className="mt-1"><SelectValue placeholder="Filter by Company" /></SelectTrigger>
                        <SelectContent>{uniqueCompanies.map(company => (<SelectItem key={company} value={company}>{company === 'all' ? 'All Companies' : company}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-department" className="text-sm font-medium">Department</Label>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={selectedCompany === 'all' && uniqueDepartments.length <= 1}>
                        <SelectTrigger id="filter-department" className="mt-1"><SelectValue placeholder="Filter by Department" /></SelectTrigger>
                        <SelectContent>{uniqueDepartments.map(dept => (<SelectItem key={dept} value={dept}>{dept === 'all' ? 'All Departments' : dept}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                ) : (
                    <div className="rounded-md border">
                    <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Department</TableHead><TableHead>Phone Model</TableHead><TableHead>Credentials</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>
                        {filteredSmartphones.length === 0 ? (
                            <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">{smartphones.length === 0 ? "No device records found." : "No records match the current filter."}</TableCell></TableRow>
                        ) : (
                            filteredSmartphones.map(device => (
                            <TableRow key={device.id}>
                                <TableCell className="font-medium">{device.company || 'N/A'}</TableCell>
                                <TableCell className="font-medium">{device.department}</TableCell>
                                <TableCell>{device.phoneModel}</TableCell>
                                <TableCell><div className="flex flex-wrap gap-1">{device.credentials && device.credentials.length > 0 ? (device.credentials.map((cred) => (<Badge key={cred.id} variant="secondary">{cred.name}</Badge>))) : (<span className="text-muted-foreground text-xs">N/A</span>)}</div></TableCell>
                                <TableCell><Badge variant={statusBadgeVariant(device.status)}>{device.status}</Badge></TableCell>
                                {isAdmin && (
                                <TableCell className="text-right">
                                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handleViewDetailsClick(device)}><Edit className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleEditDeviceClick(device)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => handleDeleteDeviceClick(device)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
        </TabsContent>
        <TabsContent value="components">
           <Card className="shadow-lg rounded-lg mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Computer Component Inventory</CardTitle>
                <CardDescription>A list of all individual computer parts.</CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddComponentFormOpen} onOpenChange={setIsAddComponentFormOpen}>
                  <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add New Computer Component</DialogTitle>
                    </DialogHeader>
                    <ComputerComponentForm employees={employees} onFormSubmissionSuccess={handleComponentFormSuccess} />
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                ) : (
                    <ComputerComponentsTable columns={computerComponentColumns} data={computerComponents} />
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {deviceToView && <DeviceDetailsDialog isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} device={deviceToView} />}
      {deviceToEdit && <Dialog open={isEditDeviceFormOpen} onOpenChange={setIsEditDeviceFormOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Edit Device Record</DialogTitle><DialogDescription>Update details for the device assigned to the {deviceToEdit.department} department.</DialogDescription></DialogHeader><EditDeviceForm deviceToEdit={deviceToEdit} employees={employees} onFormSubmissionSuccess={handleDeviceFormSuccess} /></DialogContent></Dialog>}
      {componentToEdit && <Dialog open={isEditComponentFormOpen} onOpenChange={setIsEditComponentFormOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Component Record</DialogTitle></DialogHeader><ComputerComponentForm employees={employees} onFormSubmissionSuccess={handleComponentFormSuccess} componentToEdit={componentToEdit} /></DialogContent></Dialog>}
      
      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the record for the <strong>{deviceToDelete?.phoneModel}</strong> assigned to the <strong>{deviceToDelete?.department}</strong> department? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeviceToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteDeviceConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!componentToDelete} onOpenChange={() => setComponentToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the record for the <strong>{componentToDelete?.brand} {componentToDelete?.model}</strong>? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setComponentToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteComponentConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
