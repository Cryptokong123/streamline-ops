import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Users, Package, DollarSign, CheckSquare, FileText } from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { useItems } from "@/hooks/use-items";
import { useTasks } from "@/hooks/use-tasks";
import { useDeals } from "@/hooks/use-pipeline";
import { useInvoices } from "@/hooks/use-invoices";
import { useTimeTrackingSummary } from "@/hooks/use-time-tracking";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'this_week' | 'this_month' | 'all'>('30d');

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: timeTracking, isLoading: timeLoading } = useTimeTrackingSummary();

  const isLoading = contactsLoading || itemsLoading || tasksLoading || dealsLoading || invoicesLoading || timeLoading;

  // Calculate date ranges
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'this_week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  // Filter data by date range
  const filterByDateRange = <T extends { created_at: string }>(data: T[]): T[] => {
    const range = getDateRange();
    if (!range) return data;
    return data.filter(item => {
      const date = new Date(item.created_at);
      return date >= range.start && date <= range.end;
    });
  };

  // KPI Calculations
  const totalContacts = contacts.length;
  const totalItems = items.length;
  const totalDeals = deals.length;
  const totalDealValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

  // Deal Pipeline Data
  const dealsByStage = deals.reduce((acc, deal) => {
    const stageName = deal.stage?.name || 'Unknown';
    if (!acc[stageName]) {
      acc[stageName] = { name: stageName, count: 0, value: 0 };
    }
    acc[stageName].count++;
    acc[stageName].value += deal.value || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);

  const pipelineData = Object.values(dealsByStage);

  // Invoice Status Data
  const invoicesByStatus = invoices.reduce((acc, invoice) => {
    if (!acc[invoice.status]) {
      acc[invoice.status] = { status: invoice.status, count: 0, amount: 0 };
    }
    acc[invoice.status].count++;
    acc[invoice.status].amount += invoice.total;
    return acc;
  }, {} as Record<string, { status: string; count: number; amount: number }>);

  const invoiceStatusData = Object.values(invoicesByStatus).map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.amount,
    count: item.count,
  }));

  // Task Status Data
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = 0;
    }
    acc[task.status]++;
    return acc;
  }, {} as Record<string, number>);

  const taskStatusData = Object.entries(tasksByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: count,
  }));

  // Revenue Over Time (last 30 days)
  const getLast30DaysData = () => {
    const data: Record<string, number> = {};
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'MMM dd');
      data[dateStr] = 0;
    }

    invoices.filter(inv => inv.status === 'paid' && inv.paid_date).forEach(inv => {
      const paidDate = new Date(inv.paid_date!);
      const daysAgo = Math.floor((now.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < 30) {
        const dateStr = format(paidDate, 'MMM dd');
        if (data[dateStr] !== undefined) {
          data[dateStr] += inv.total;
        }
      }
    });

    return Object.entries(data).map(([date, revenue]) => ({ date, revenue }));
  };

  const revenueData = getLast30DaysData();

  // Contact Types Distribution
  const contactsByType = contacts.reduce((acc, contact) => {
    const typeName = contact.type?.label || 'No Type';
    if (!acc[typeName]) {
      acc[typeName] = 0;
    }
    acc[typeName]++;
    return acc;
  }, {} as Record<string, number>);

  const contactTypeData = Object.entries(contactsByType).map(([name, value]) => ({ name, value }));

  // Item Types Distribution
  const itemsByType = items.reduce((acc, item) => {
    const typeName = item.type?.label || 'No Type';
    if (!acc[typeName]) {
      acc[typeName] = 0;
    }
    acc[typeName]++;
    return acc;
  }, {} as Record<string, number>);

  const itemTypeData = Object.entries(itemsByType).map(([name, value]) => ({ name, value }));

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              £{totalOutstanding.toLocaleString()} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalDealValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDeals} active deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {contactTypeData.length} types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}/{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingTasks} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {itemTypeData.length} types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              £{totalInvoiced.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        {timeTracking && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hours Tracked</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeTracking.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeTracking.totalBillableHours.toFixed(1)}h billable
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unbilled Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{timeTracking.totalUninvoiced.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ready to invoice
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Deals by Stage (Count)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deal Value by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `£${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" name="Value (£)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: £${entry.value.toLocaleString()}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {invoiceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `£${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {invoiceStatusData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">
                        {item.name}: {item.count} ({((item.value / totalInvoiced) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contacts by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contactTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Items by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={itemTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#82ca9d" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
