
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
  // Average Salary will be dynamically calculated if data exists
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

  const [avgSalaryByDeptData, setAvgSalaryByDeptData] = useState<typeof initialAvgSalaryByDeptData>(initialAvgSalaryByDeptData);
  const [avgSalaryByDeptConfig, setAvgSalaryByDeptConfig] = useState(initialAvgSalaryByDeptConfig);

  const [dynamicGenderData, setDynamicGenderData] = useState<typeof initialGenderDiversityData>(initialGenderDiversityData);


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
      const totalEmployeesMetric = { 
          title: "Total Employees", 
          value: employees.length.toLocaleString(), 
          change: "+5% this month", // Static change for now
          changeType: "positive" as "positive" | "negative", 
          icon: Users 
      };
      
      // Update Average Salary metric
      const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
      const employeesWithSalary = employees.filter(emp => typeof emp.salary === 'number').length;
      const avgSalaryValue = employeesWithSalary > 0 ? (totalSalary / employeesWithSalary) : 0;
      const averageSalaryMetric = {
          title: "Average Salary",
          value: `$${avgSalaryValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
          change: "+2.5% this year", // Static change for now
          changeType: "positive" as "positive" | "negative",
          icon: DollarSign
      };

      setProcessedMetrics(prevMetrics => {
          const otherMetrics = prevMetrics.filter(m => m.title !== "Total Employees" && m.title !== "Average Salary");
          return [totalEmployeesMetric, averageSalaryMetric, ...otherMetrics];
      });


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
        return { name: deptName, value: count, fill: color }; 
      }).sort((a,b) => b.value - a.value); 

      setHeadcountChartData(newHeadcountData);
      setHeadcountChartConfig(newHeadcountConfig);

      // Process Average Salary by Department
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

      // Process Gender Diversity
      let maleCount = 0;
      let femaleCount = 0;
      let otherCount = 0;
      employees.forEach(emp => {
        if (emp.gender === "Male") maleCount++;
        else if (emp.gender === "Female") femaleCount++;
        else otherCount++; // Includes "Other", "Prefer not to say", or undefined
      });
      
      const newGenderData = [];
      if (maleCount > 0) newGenderData.push({ name: "Male", value: maleCount, fill: genderDiversityConfig.male.color || "hsl(var(--chart-1))" });
      if (femaleCount > 0) newGenderData.push({ name: "Female", value: femaleCount, fill: genderDiversityConfig.female.color || "hsl(var(--chart-2))" });
      if (otherCount > 0) newGenderData.push({ name: "Other", value: otherCount, fill: genderDiversityConfig.other.color || "hsl(var(--chart-3))" });
      
      setDynamicGenderData(newGenderData);

    } else if (!isLoadingEmployees && employees.length === 0) {
        setProcessedMetrics(prevMetrics =>
            prevMetrics.map(metric =>
            metric.title === "Total Employees"
                ? { ...metric, value: "0" }
                : metric.title === "Average Salary" ? {...metric, value: "$0" }
                : metric
            )
        );
        setHeadcountChartData([]);
        setHeadcountChartConfig({ value: { label: "Employees" } });
        setAvgSalaryByDeptData([]);
        setAvgSalaryByDeptConfig({ avgSalary: { label: "Average Salary ($)" } });
        setDynamicGenderData([]);
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
    return processedMetrics.concat(dynamicWifiMetrics);
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

    
