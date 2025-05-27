"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Users, Briefcase, TrendingUp, Clock, Building, Percent } from "lucide-react"; // Renamed to avoid conflict
import type { Metric } from "@/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, Line, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, LineChart, PieChart } from "recharts"; // Added BarChart, LineChart, PieChart here

const metrics: Metric[] = [
  { title: "Total Employees", value: "1,250", change: "+5% this month", changeType: "positive", icon: Users },
  { title: "Turnover Rate", value: "12%", change: "-1.2% vs last quarter", changeType: "positive", icon: TrendingUp },
  { title: "Average Tenure", value: "4.2 Years", icon: Clock },
  { title: "Open Positions", value: "23", icon: Briefcase },
];

const headcountData = [
  { name: "Engineering", value: 400, fill: "var(--color-engineering)" },
  { name: "Sales", value: 300, fill: "var(--color-sales)" },
  { name: "Marketing", value: 200, fill: "var(--color-marketing)" },
  { name: "HR", value: 50, fill: "var(--color-hr)" },
  { name: "Support", value: 150, fill: "var(--color-support)" },
  { name: "Finance", value: 150, fill: "var(--color-finance)" },
];
const headcountConfig = {
  value: { label: "Employees" },
  engineering: { label: "Engineering", color: "hsl(var(--chart-1))" },
  sales: { label: "Sales", color: "hsl(var(--chart-2))" },
  marketing: { label: "Marketing", color: "hsl(var(--chart-3))" },
  hr: { label: "HR", color: "hsl(var(--chart-4))" },
  support: { label: "Support", color: "hsl(var(--chart-5))" },
  finance: { label: "Finance", color: "hsl(var(--chart-1))" }, // Re-use a color for simplicity
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
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">HR Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <p className={`text-xs ${metric.changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
                  {metric.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Headcount by Department</CardTitle>
            <CardDescription>Current employee distribution across departments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={headcountConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="value" radius={4}>
                    {headcountData.map((entry) => (
                       <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
      </div>
       <Card className="shadow-md hover:shadow-lg transition-shadow lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />Gender Diversity</CardTitle>
            <CardDescription>Current gender distribution in the company.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={genderDiversityConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie data={genderDiversityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                     {genderDiversityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
    </div>
  );
}
