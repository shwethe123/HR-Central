
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, TrendingUp, Clock, Building, Percent, DollarSign, Activity, Wifi, Loader2, Megaphone, PlusCircle, UserX, Calendar, Info } from "lucide-react";
import type { Metric, WifiBill, Employee, Announcement, LeaveRequest } from "@/types"; // Added LeaveRequest
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Line, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, LineChart, PieChart as RechartsPieChart } from "recharts";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore'; // Added limit, Timestamp
import { useToast } from '@/hooks/use-toast';
import { isValid, parseISO, differenceInMilliseconds, format as formatDateFn, isWithinInterval, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context'; // For admin check
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AddAnnouncementForm } from './add-announcement-form';
import { Badge } from '@/components/ui/badge';


// Initial static metrics (Total Employees, Average Salary, Average Tenure will be updated dynamically)
const initialStaticMetrics: Metric[] = [
  { title: "Total Employees", value: "Loading...", icon: Users },
  { title: "Average Salary", value: "Loading...", icon: DollarSign },
  { title: "Average Tenure", value: "Loading...", icon: Clock },
  { title: "Turnover Rate", value: "12%", icon: TrendingUp }, // Removed change for simplicity
];

// Initial static chart data (Headcount by Department will be updated dynamically)
const initialHeadcountData = [
  { name: "Engineering", value: 0, fill: "var(--color-engineering)" },
  { name: "Sales", value: 0, fill: "var(--color-sales)" },
];

const initialHeadcountConfig: Record<string, { label: string; color?: string }> = {
  value: { label: "Employees" },
  engineering: { label: "Engineering", color: "hsl(var(--chart-1))" },
  sales: { label: "Sales", color: "hsl(var(--chart-2))" },
  marketing: { label: "Marketing", color: "hsl(var(--chart-3))" },
  hr: { label: "HR", color: "hsl(var(--chart-4))" },
  support: { label: "Support", color: "hsl(var(--chart-5))" },
  finance: { label: "Finance", color: "hsl(var(--chart-1))" },
};

const turnoverTrendData = [
  { month: "Jan", rate: 1.5 }, { month: "Feb", rate: 1.2 }, { month: "Mar", rate: 1.8 },
  { month: "Apr", rate: 1.4 }, { month: "May", rate: 1.1 }, { month: "Jun", rate: 1.6 },
];
const turnoverConfig = {
  rate: { label: "Turnover Rate (%)", color: "hsl(var(--chart-1))" },
};

// Initial Gender Diversity data (will be updated dynamically)
const initialGenderDiversityData = [
  { name: "Male", value: 0, fill: "var(--color-male)" },
  { name: "Female", value: 0, fill: "var(--color-female)" },
  { name: "Other", value: 0, fill: "var(--color-other)" },
];
const genderDiversityConfig = {
  value: { label: "Percentage" },
  male: { label: "Male", color: "hsl(var(--chart-1))" },
  female: { label: "Female", color: "hsl(var(--chart-2))" },
  other: { label: "Other/Prefer not to say", color: "hsl(var(--chart-3))" },
};

const initialAvgSalaryByDeptData = [
  { department: "Engineering", avgSalary: 0, fill: "var(--color-engineering-salary)" },
  { department: "Sales", avgSalary: 0, fill: "var(--color-sales-salary)" },
];
const initialAvgSalaryByDeptConfig = {
  avgSalary: { label: "Average Salary ($)" },
  "engineering-salary": { label: "Engineering", color: "hsl(var(--chart-5))" },
  "sales-salary": { label: "Sales", color: "hsl(var(--chart-4))" },
};

const employeeStatusConfig = {
  value: { label: "Employees" },
  active: { label: "Active", color: "hsl(var(--chart-2))" },
  inactive: { label: "Inactive", color: "hsl(var(--chart-5))" },
};

// Predefined department colors and a cycle for new departments
const departmentColorMap: Record<string, string> = {
  "engineering": "hsl(var(--chart-1))",
  "sales": "hsl(var(--chart-2))",
  "marketing": "hsl(var(--chart-3))",
  "hr": "hsl(var(--chart-4))",
  "support": "hsl(var(--chart-5))",
  "finance": "hsl(var(--chart-1))",
};
const chartColorCycle = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const ANNOUNCEMENTS_FETCH_LIMIT = 5;


export default function DashboardPage() {
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false); // For client-side effects

  const [wifiBills, setWifiBills] = useState<WifiBill[]>([]);
  const [isLoadingWifiBills, setIsLoadingWifiBills] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [processedMetrics, setProcessedMetrics] = useState<Metric[]>(initialStaticMetrics);
  
  const [headcountChartData, setHeadcountChartData] = useState<typeof initialHeadcountData>(initialHeadcountData);
  const [headcountChartConfig, setHeadcountChartConfig] = useState(initialHeadcountConfig);

  const [avgSalaryByDeptData, setAvgSalaryByDeptData] = useState<typeof initialAvgSalaryByDeptData>(initialAvgSalaryByDeptData);
  const [avgSalaryByDeptConfig, setAvgSalaryByDeptConfig] = useState(initialAvgSalaryByDeptConfig);

  const [dynamicGenderData, setDynamicGenderData] = useState<typeof initialGenderDiversityData>(initialGenderDiversityData);
  const [employeeStatusData, setEmployeeStatusData] = useState<{name: string, value: number, fill: string}[]>([]);

  const [announcementsData, setAnnouncementsData] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isAddAnnouncementDialogOpen, setIsAddAnnouncementDialogOpen] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(true);

  useEffect(() => {
    setIsMounted(true); // Component has mounted
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoadingAnnouncements(true);
    try {
      const announcementsCollectionRef = collection(db, "announcements");
      const q = query(announcementsCollectionRef, orderBy("createdAt", "desc"), limit(ANNOUNCEMENTS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedAnnouncements: Announcement[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt, 
        } as Announcement;
      });
      setAnnouncementsData(fetchedAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast({
        title: "Error Fetching Announcements",
        description: "Could not load company announcements.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, [toast]);


  const fetchWifiBills = useCallback(async () => {
    setIsLoadingWifiBills(true);
    try {
      const billsCollectionRef = collection(db, "wifiBills");
      const q = query(billsCollectionRef); // Consider adding orderBy and limit if needed
      const querySnapshot = await getDocs(q);
      const fetchedBills: WifiBill[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as WifiBill));
      setWifiBills(fetchedBills);
    } catch (error) {
      console.error("Error fetching WiFi bills:", error);
      toast({
        title: "Error Fetching WiFi Data",
        description: "Could not load WiFi bill information for the dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWifiBills(false);
    }
  }, [toast]);

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      const q = query(employeesCollectionRef); // Consider adding orderBy and limit if needed
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Employee));
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Error Fetching Employee Data",
        description: "Could not load employee information for the dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [toast]);

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoadingLeaveRequests(true);
    try {
      const leaveRequestsCollectionRef = collection(db, "leaveRequests");
      const q = query(leaveRequestsCollectionRef, orderBy("startDate", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedRequests: LeaveRequest[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as LeaveRequest));
      setLeaveRequests(fetchedRequests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast({
        title: "Error Fetching Leave Data",
        description: "Could not load leave requests for the dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLeaveRequests(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isMounted) {
      fetchWifiBills();
      fetchEmployees();
      fetchAnnouncements();
      fetchLeaveRequests();
    }
  }, [isMounted, fetchWifiBills, fetchEmployees, fetchAnnouncements, fetchLeaveRequests]);

  const employeesOnLeaveToday = useMemo(() => {
    if (isLoadingLeaveRequests || isLoadingEmployees) return [];
    
    const today = new Date();
    const todayStart = startOfDay(today);
    
    const todaysLeaveRequests = leaveRequests.filter(req => {
      if (req.status !== 'Approved') return false;
      
      try {
        const startDate = parseISO(req.startDate);
        const endDate = parseISO(req.endDate);
        if (isValid(startDate) && isValid(endDate)) {
          return isWithinInterval(todayStart, { start: startDate, end: endOfDay(endDate) });
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    return todaysLeaveRequests.map(req => {
      const employee = employees.find(emp => emp.id === req.employeeId);
      
      let durationDays = 1;
      try {
        const startDate = parseISO(req.startDate);
        const endDate = parseISO(req.endDate);
        if (isValid(startDate) && isValid(endDate)) {
          durationDays = differenceInDays(endDate, startDate) + 1;
        }
      } catch(e) { /* ignore parse error, default to 1 day */ }
      
      return {
        ...req,
        employeeName: employee?.name || req.employeeName,
        employeeDepartment: employee?.department || 'Unknown',
        employeeCompany: employee?.company || 'Unknown',
        leaveDuration: durationDays,
      };
    }).sort((a,b) => a.employeeName.localeCompare(b.employeeName));
  }, [leaveRequests, employees, isLoadingLeaveRequests, isLoadingEmployees]);


  useEffect(() => {
    if (!isLoadingEmployees && employees.length > 0) {
      const totalEmployeesMetric: Metric = { 
          title: "Total Employees", 
          value: employees.length.toLocaleString(), 
          icon: Users 
      };
      
      const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
      const employeesWithSalary = employees.filter(emp => typeof emp.salary === 'number').length;
      const avgSalaryValue = employeesWithSalary > 0 ? (totalSalary / employeesWithSalary) : 0;
      const averageSalaryMetric: Metric = {
          title: "Average Salary",
          value: `$${avgSalaryValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
          icon: DollarSign
      };

      let totalTenureMs = 0;
      let employeesWithValidStartDate = 0;
      const today = new Date();
      employees.forEach(emp => {
        if (emp.startDate) {
            let startDateObj: Date | null = null;
            if (typeof emp.startDate === 'string') {
                startDateObj = parseISO(emp.startDate);
            } else if (emp.startDate instanceof Date) { 
                startDateObj = emp.startDate;
            } else if (emp.startDate && typeof (emp.startDate as any).toDate === 'function') {
                 startDateObj = (emp.startDate as Timestamp).toDate();
            }

            if (startDateObj && isValid(startDateObj)) {
                const diffMs = differenceInMilliseconds(today, startDateObj);
                if (diffMs > 0) {
                    totalTenureMs += diffMs;
                    employeesWithValidStartDate++;
                }
            } else {
                console.warn(`Invalid or unparseable start date for employee ${emp.employeeId}: ${emp.startDate}`);
            }
        }
      });
      const avgTenureYears = employeesWithValidStartDate > 0
        ? (totalTenureMs / employeesWithValidStartDate / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
        : "0.0";
      const averageTenureMetric: Metric = {
        title: "Average Tenure",
        value: `${avgTenureYears} Years`,
        icon: Clock,
      };

      let activeCount = 0;
      let inactiveCount = 0;
      employees.forEach(emp => {
        if (emp.status === "Active" || emp.status === "active" || !emp.status) {
          activeCount++;
        } else if (emp.status === "Inactive" || emp.status === "inactive") {
          inactiveCount++;
        }
      });
      setEmployeeStatusData([
        { name: "Active", value: activeCount, fill: "var(--color-active)" },
        { name: "Inactive", value: inactiveCount, fill: "var(--color-inactive)" },
      ]);

      setProcessedMetrics(prevMetrics => {
          const otherMetrics = prevMetrics.filter(
            m => m.title !== "Total Employees" &&
                 m.title !== "Average Salary" &&
                 m.title !== "Average Tenure"
          );
          const newMetrics = [
            totalEmployeesMetric, 
            averageSalaryMetric, 
            averageTenureMetric, 
            ...otherMetrics
          ];
          const order = ["Total Employees", "Average Salary", "Average Tenure", "Turnover Rate"];
          newMetrics.sort((a,b) => {
            const indexA = order.indexOf(a.title);
            const indexB = order.indexOf(b.title);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          return newMetrics;
      });

      const countsByDept: Record<string, number> = {};
      employees.forEach(emp => {
        const dept = emp.department || "Unknown";
        countsByDept[dept] = (countsByDept[dept] || 0) + 1;
      });
      const newHeadcountConfig: Record<string, { label: string; color?: string }> = { value: { label: "Employees" } };
      let colorIndex = 0;
      const newHeadcountData = Object.entries(countsByDept).map(([deptName, count]) => {
        const deptSlug = deptName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const colorKey = deptName.toLowerCase();
        let color = departmentColorMap[colorKey];
        if (!color) {
          color = chartColorCycle[colorIndex % chartColorCycle.length];
          colorIndex++;
        }
        newHeadcountConfig[deptSlug] = { label: deptName, color: color };
        return { name: deptName, value: count, fill: color }; 
      }).sort((a,b) => b.value - a.value); 
      setHeadcountChartData(newHeadcountData);
      setHeadcountChartConfig(newHeadcountConfig);

      const salariesByDept: Record<string, { totalSalary: number; count: number }> = {};
      employees.forEach(emp => {
        if (emp.department && typeof emp.salary === 'number' && !isNaN(emp.salary)) {
          const dept = emp.department;
          salariesByDept[dept] = salariesByDept[dept] || { totalSalary: 0, count: 0 };
          salariesByDept[dept].totalSalary += emp.salary;
          salariesByDept[dept].count++;
        }
      });
      const newAvgSalaryConfig: Record<string, { label: string; color?: string }> = { avgSalary: { label: "Average Salary ($)" } };
      let salaryColorIndex = 0;
      const newAvgSalaryData = Object.entries(salariesByDept)
        .filter(([, data]) => data.count > 0) 
        .map(([deptName, data]) => {
          const avgSalary = data.totalSalary / data.count;
          const deptSlugSalary = `${deptName.toLowerCase().replace(/\s+/g, '-')}-salary`;
          const colorKey = deptName.toLowerCase();
          let color = departmentColorMap[colorKey]; 
          if (!color) { 
            color = chartColorCycle[salaryColorIndex % chartColorCycle.length];
            salaryColorIndex++;
          }
          newAvgSalaryConfig[deptSlugSalary] = { label: deptName, color: color };
          return { department: deptName, avgSalary: Math.round(avgSalary), fill: color };
        })
        .sort((a, b) => b.avgSalary - a.avgSalary); 
      setAvgSalaryByDeptData(newAvgSalaryData);
      setAvgSalaryByDeptConfig(newAvgSalaryConfig);

      let maleCount = 0;
      let femaleCount = 0;
      let otherCount = 0;
      employees.forEach(emp => {
        if (emp.gender === "Male") maleCount++;
        else if (emp.gender === "Female") femaleCount++;
        else otherCount++;
      });
      const newGenderData = [];
      if (maleCount > 0) newGenderData.push({ name: "Male", value: maleCount, fill: genderDiversityConfig.male.color || "hsl(var(--chart-1))" });
      if (femaleCount > 0) newGenderData.push({ name: "Female", value: femaleCount, fill: genderDiversityConfig.female.color || "hsl(var(--chart-2))" });
      if (otherCount > 0) newGenderData.push({ name: "Other", value: otherCount, fill: genderDiversityConfig.other.color || "hsl(var(--chart-3))" });
      setDynamicGenderData(newGenderData);

    } else if (!isLoadingEmployees && employees.length === 0) {
        setProcessedMetrics(prevMetrics =>
            prevMetrics.map(metric =>
                metric.title === "Total Employees" ? { ...metric, value: "0" } :
                metric.title === "Average Salary" ? {...metric, value: "$0" } :
                metric.title === "Average Tenure" ? {...metric, value: "N/A"} :
                metric
            )
        );
        setHeadcountChartData([]);
        setHeadcountChartConfig({ value: { label: "Employees" } });
        setAvgSalaryByDeptData([]);
        setAvgSalaryByDeptConfig({ avgSalary: { label: "Average Salary ($)" } });
        setDynamicGenderData([]);
        setEmployeeStatusData([]);
    }
  }, [employees, isLoadingEmployees]);

  const dynamicWifiMetrics: Metric[] = useMemo(() => {
    if (isLoadingWifiBills) {
      return [
        { title: "Total WiFi Connections", value: "Loading...", icon: Loader2 },
        { title: "Total WiFi Bill (฿)", value: "Loading...", icon: Loader2 },
      ];
    }
    const metrics: Metric[] = [];
    metrics.push({
      title: "Total WiFi Connections",
      value: wifiBills.length.toString(),
      icon: Wifi,
    });

    const totalMMK = wifiBills
      .filter(bill => bill.currency === "MMK" || !bill.currency)
      .reduce((sum, bill) => sum + (bill.billAmount || 0), 0);
    metrics.push({
      title: "Total WiFi Bill (฿)",
      value: totalMMK.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ฿",
      icon: DollarSign,
    });

    const usdBills = wifiBills.filter(bill => bill.currency === "USD");
    if (usdBills.length > 0) {
      const totalUSD = usdBills.reduce((sum, bill) => sum + (bill.billAmount || 0), 0);
      metrics.push({
        title: "Total WiFi Bill (USD)",
        value: totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        icon: DollarSign,
      });
    }
    return metrics;
  }, [wifiBills, isLoadingWifiBills]);

  const allMetrics = useMemo(() => {
    const staticOnlyMetrics = initialStaticMetrics.filter(
        initialMetric => !processedMetrics.some(pMetric => pMetric.title === initialMetric.title)
    );
    
    let combinedMetrics = [...processedMetrics];
    const turnoverMetric = initialStaticMetrics.find(m => m.title === "Turnover Rate");
    if (turnoverMetric && !combinedMetrics.some(m => m.title === "Turnover Rate")) {
        combinedMetrics.push(turnoverMetric);
    }
    
    combinedMetrics = combinedMetrics.concat(dynamicWifiMetrics);

    const preferredOrder = [
      "Total Employees", 
      "Average Salary", 
      "Average Tenure", 
      "Turnover Rate", 
      "Total WiFi Connections", 
      "Total WiFi Bill (฿)", 
      "Total WiFi Bill (USD)"
    ];
    
    combinedMetrics.sort((a,b) => {
        const indexA = preferredOrder.indexOf(a.title);
        const indexB = preferredOrder.indexOf(b.title);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    
    return combinedMetrics;
  }, [processedMetrics, dynamicWifiMetrics]);

  const handleAnnouncementFormSuccess = (newAnnouncementId?: string) => {
    fetchAnnouncements(); 
    setIsAddAnnouncementDialogOpen(false); 
  };

  const formatAnnouncementDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Date not available';
    if (timestamp instanceof Timestamp) {
        return formatDateFn(timestamp.toDate(), 'PP'); 
    }
    return 'Invalid Date';
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">HR Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {allMetrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-5 w-5 text-muted-foreground ${metric.value === "Loading..." ? "animate-spin" : ""}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && metric.value !== "Loading..." && (
                <p className={`text-xs ${metric.changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
                  {metric.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Headcount by Department</CardTitle>
            <CardDescription>Current employee distribution across departments.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="ml-2 text-muted-foreground">Loading headcount data...</p>
              </div>
            ) : headcountChartData.length === 0 ? (
                 <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                    No employee data available for departments.
                </div>
            ) : (
              <ChartContainer config={headcountChartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={headcountChartData} accessibilityLayer layout="vertical" margin={{ left: 20, right: 20}}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3"/>
                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={10} 
                        className="text-xs"
                        width={80} 
                        interval={0} 
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="value" radius={4} barSize={20}>
                      {headcountChartData.map((entry, index) => (
                         <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Monthly Turnover Trend</CardTitle>
            <CardDescription>Employee turnover rate over the past 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={turnoverConfig} className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={turnoverTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-rate)"}} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />Gender Diversity</CardTitle>
            <CardDescription>Current gender distribution in the company.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading gender data...</p>
                </div>
            ) : dynamicGenderData.length === 0 ? (
                 <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                    No gender data available.
                </div>
            ) : (
            <ChartContainer config={genderDiversityConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart accessibilityLayer>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} 
                     formatter={(value: number, name: string, props: any) => {
                        const total = dynamicGenderData.reduce((sum, entry) => sum + entry.value, 0);
                        if (total === 0) return [`${value.toLocaleString()}`, name];
                        const percentage = ((value / total) * 100).toFixed(1);
                        return [`${value.toLocaleString()} (${percentage}%)`, name];
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie data={dynamicGenderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                     {dynamicGenderData.map((entry, index) => (
                        <Cell key={`cell-gender-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Average Salary by Department</CardTitle>
            <CardDescription>Average annual salary distribution across departments.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
                 <div className="h-[300px] w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading salary data...</p>
                </div>
            ) : avgSalaryByDeptData.length === 0 ? (
                <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                    No salary data available for departments.
                </div>
            ) : (
            <ChartContainer config={avgSalaryByDeptConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgSalaryByDeptData} accessibilityLayer margin={{ left: 5, right: 20, bottom: 50}}>
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="department" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false} 
                    className="text-xs" 
                    interval={0} 
                    angle={-40} 
                    textAnchor="end"
                  />
                  <YAxis 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                    className="text-xs"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                                formatter={(value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                                hideLabel 
                            />} 
                  />
                  <Bar dataKey="avgSalary" name="Average Salary" radius={4} barSize={20}>
                    {avgSalaryByDeptData.map((entry) => (
                       <Cell key={`cell-salary-${entry.department}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Employee Status</CardTitle>
            <CardDescription>Distribution of active and inactive employees.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading employee status data...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                No employee data available.
              </div>
            ) : (
              <ChartContainer config={employeeStatusConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart accessibilityLayer>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      formatter={(value: number, name: string, props: any) => {
                        const totalEmployees = employees.length;
                        if (totalEmployees === 0) return [`${value.toLocaleString()}`, name];
                        const percentage = ((value / totalEmployees) * 100).toFixed(1);
                        return [`${value.toLocaleString()} (${percentage}%)`, name];
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    <Pie 
                      data={employeeStatusData}
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      label
                    >
                      <Cell key="cell-active" fill="var(--color-active)" />
                      <Cell key="cell-inactive" fill="var(--color-inactive)" />
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow lg:col-span-1 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Company Announcements</CardTitle>
                <CardDescription>Latest news and updates from the company.</CardDescription>
            </div>
             {isAdmin && !authLoading && (
                 <Dialog open={isAddAnnouncementDialogOpen} onOpenChange={setIsAddAnnouncementDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Announcement</DialogTitle>
                            <DialogDescription>
                                Share important updates with the company.
                            </DialogDescription>
                        </DialogHeader>
                        <AddAnnouncementForm onFormSubmissionSuccess={handleAnnouncementFormSuccess} />
                    </DialogContent>
                </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? ( 
                <div className="h-[300px] w-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading announcements...</p>
                </div>
            ) : announcementsData.length === 0 ? (
                <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                    No announcements available at the moment.
                </div>
            ) : (
              <ScrollArea className="h-[300px] pr-3"> 
                <div className="space-y-4">
                  {announcementsData.map((announcement) => (
                    <div key={announcement.id} className="pb-3 border-b last:border-b-0">
                      <h3 className="text-md font-semibold text-foreground mb-0.5">{announcement.title}</h3>
                      <div className="text-xs text-muted-foreground mb-1.5">
                        <span>{formatAnnouncementDate(announcement.createdAt)}</span>
                        {announcement.authorName && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>By {announcement.authorName}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-3">{announcement.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

      </div>
      <Card className="shadow-md hover:shadow-lg transition-shadow lg:col-span-1 xl:col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserX className="h-5 w-5 text-primary" />Today's Absences & Leaves</CardTitle>
          <CardDescription>Employees with approved leave for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLeaveRequests || isLoadingEmployees ? (
            <div className="h-[200px] w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading leave data...</p>
            </div>
          ) : employeesOnLeaveToday.length === 0 ? (
            <div className="h-[200px] w-full flex flex-col items-center justify-center text-muted-foreground">
              <UserX className="h-10 w-10 mb-2"/>
              <p>No one is on leave today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employeesOnLeaveToday.map(req => (
                <div key={req.id} className="flex flex-col p-3 rounded-md border bg-card hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                      <div>
                          <p className="font-semibold text-sm">{req.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{req.employeeDepartment} / {req.employeeCompany}</p>
                      </div>
                      <Badge variant="outline" className="text-xs whitespace-nowrap capitalize">{req.leaveType}</Badge>
                  </div>
                  <div className="border-t my-2"></div>
                  <div className="space-y-1.5 text-xs">
                      <div className="flex items-center text-muted-foreground">
                          <Calendar className="mr-2 h-3.5 w-3.5" />
                          <span>
                              {formatDateFn(parseISO(req.startDate), 'MMM d')} - {formatDateFn(parseISO(req.endDate), 'MMM d')}
                              <span className="text-primary ml-1.5 font-medium">({req.leaveDuration} day{req.leaveDuration > 1 ? 's' : ''})</span>
                          </span>
                      </div>
                       <div className="flex items-start text-muted-foreground">
                          <Info className="mr-2 h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <p className="whitespace-pre-wrap">{req.reason}</p>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

    

    