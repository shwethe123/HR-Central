
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, TrendingUp, Clock, Building, Percent, DollarSign, Activity, Wifi, Loader2 } from "lucide-react";
import type { Metric, WifiBill, Employee } from "@/types"; // Added Employee
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Line, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, LineChart, PieChart as RechartsPieChart } from "recharts";
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Initial static metrics (Total Employees will be updated dynamically)
const initialStaticMetrics: Metric[] = [
  { title: "Total Employees", value: "Loading...", change: "+5% this month", changeType: "positive", icon: Users },
  { title: "Turnover Rate", value: "12%", change: "-1.2% vs last quarter", changeType: "positive", icon: TrendingUp },
  { title: "Average Tenure", value: "4.2 Years", icon: Clock },
  { title: "Average Salary", value: "$75,200", change: "+2.5% this year", changeType: "positive", icon: DollarSign },
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
  finance: { label: "Finance", color: "hsl(var(--chart-1))" }, // Re-uses chart-1
};


const turnoverTrendData = [
  { month: "Jan", rate: 1.5 }, { month: "Feb", rate: 1.2 }, { month: "Mar", rate: 1.8 },
  { month: "Apr", rate: 1.4 }, { month: "May", rate: 1.1 }, { month: "Jun", rate: 1.6 },
];
const turnoverConfig = {
  rate: { label: "Turnover Rate (%)", color: "hsl(var(--chart-1))" },
};

const genderDiversityData = [
  { name: "Male", value: 60, fill: "var(--color-male)" },
  { name: "Female", value: 35, fill: "var(--color-female)" },
  { name: "Other", value: 5, fill: "var(--color-other)" },
];
const genderDiversityConfig = {
  value: { label: "Percentage" },
  male: { label: "Male", color: "hsl(var(--chart-1))" },
  female: { label: "Female", color: "hsl(var(--chart-2))" },
  other: { label: "Other/Prefer not to say", color: "hsl(var(--chart-3))" },
};

const avgSalaryByDeptData = [
  { department: "Engineering", avgSalary: 95000, fill: "var(--color-engineering-salary)" },
  { department: "Sales", avgSalary: 82000, fill: "var(--color-sales-salary)" },
  { department: "Marketing", avgSalary: 78000, fill: "var(--color-marketing-salary)" },
  { department: "HR", avgSalary: 72000, fill: "var(--color-hr-salary)" },
  { department: "Support", avgSalary: 65000, fill: "var(--color-support-salary)" },
  { department: "Finance", avgSalary: 88000, fill: "var(--color-finance-salary)" },
];
const avgSalaryByDeptConfig = {
  avgSalary: { label: "Average Salary ($)" },
  "engineering-salary": { label: "Engineering", color: "hsl(var(--chart-5))" },
  "sales-salary": { label: "Sales", color: "hsl(var(--chart-4))" },
  "marketing-salary": { label: "Marketing", color: "hsl(var(--chart-3))" },
  "hr-salary": { label: "HR", color: "hsl(var(--chart-2))" },
  "support-salary": { label: "Support", color: "hsl(var(--chart-1))" },
  "finance-salary": { label: "Finance", color: "hsl(var(--chart-5))" },
};

const employeeStatusData = [
  { name: "Active", value: 950, fill: "var(--color-active)" },
  { name: "Inactive", value: 300, fill: "var(--color-inactive)" },
];
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
  "finance": "hsl(var(--chart-1))", // Re-uses chart-1
};
const chartColorCycle = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


export default function DashboardPage() {
  const totalEmployeesForStatusChart = employeeStatusData.reduce((sum, entry) => sum + entry.value, 0);
  const { toast } = useToast();
  const [wifiBills, setWifiBills] = useState<WifiBill[]>([]);
  const [isLoadingWifiBills, setIsLoadingWifiBills] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [processedMetrics, setProcessedMetrics] = useState<Metric[]>(initialStaticMetrics);
  const [headcountChartData, setHeadcountChartData] = useState<typeof initialHeadcountData>(initialHeadcountData);
  const [headcountChartConfig, setHeadcountChartConfig] = useState(initialHeadcountConfig);


  const fetchWifiBills = useCallback(async () => {
    setIsLoadingWifiBills(true);
    try {
      const billsCollectionRef = collection(db, "wifiBills");
      const q = query(billsCollectionRef);
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
      const q = query(employeesCollectionRef); // Get all employees
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

  useEffect(() => {
    fetchWifiBills();
    fetchEmployees();
  }, [fetchWifiBills, fetchEmployees]);

  useEffect(() => {
    if (!isLoadingEmployees && employees.length > 0) {
      // Update Total Employees metric
      setProcessedMetrics(prevMetrics =>
        prevMetrics.map(metric =>
          metric.title === "Total Employees"
            ? { ...metric, value: employees.length.toLocaleString() }
            : metric
        )
      );

      // Process Headcount by Department
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
        return { name: deptName, value: count, fill: color }; // Use direct color for Cell fill
      }).sort((a,b) => b.value - a.value); // Sort by value descending

      setHeadcountChartData(newHeadcountData);
      setHeadcountChartConfig(newHeadcountConfig);
    } else if (!isLoadingEmployees && employees.length === 0) {
        // Handle case where there are no employees
        setProcessedMetrics(prevMetrics =>
            prevMetrics.map(metric =>
            metric.title === "Total Employees"
                ? { ...metric, value: "0" }
                : metric
            )
        );
        setHeadcountChartData([]);
        setHeadcountChartConfig({ value: { label: "Employees" } });
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
    const staticPortion = processedMetrics.filter(m => m.title !== "Total Employees");
    const dynamicTotalEmployees = processedMetrics.find(m => m.title === "Total Employees");
    return [
        ...(dynamicTotalEmployees ? [dynamicTotalEmployees] : [initialStaticMetrics.find(m => m.title === "Total Employees")!]),
        ...staticPortion,
        ...dynamicWifiMetrics
    ];
  }, [processedMetrics, dynamicWifiMetrics]);


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
                        width={80} // Adjust width as needed for longer names
                        interval={0} // Show all labels
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
            <ChartContainer config={genderDiversityConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart accessibilityLayer>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} 
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie data={genderDiversityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                     {genderDiversityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Average Salary by Department</CardTitle>
            <CardDescription>Average annual salary distribution across departments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={avgSalaryByDeptConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgSalaryByDeptData} accessibilityLayer margin={{ left: 20, right: 20}}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="department" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" interval={0} angle={-30} textAnchor="end" height={50}/>
                  <YAxis tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => `$${(value / 1000)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} />} />
                  {/* <ChartLegend content={<ChartLegendContent />} /> */} {/* Legend might be too noisy for this chart */}
                  <Bar dataKey="avgSalary" name="Average Salary" radius={4} barSize={20}>
                    {avgSalaryByDeptData.map((entry) => (
                       <Cell key={`cell-salary-${entry.department}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Employee Status</CardTitle>
            <CardDescription>Distribution of active and inactive employees.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={employeeStatusConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart accessibilityLayer>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    formatter={(value: number, name: string, props: any) => {
                      if (totalEmployeesForStatusChart === 0) return [`${value.toLocaleString()}`, name];
                      const percentage = ((value / totalEmployeesForStatusChart) * 100).toFixed(1);
                      return [`${value.toLocaleString()} (${percentage}%)`, name];
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie data={employeeStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                     {employeeStatusData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

    