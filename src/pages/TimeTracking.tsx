import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Play, Pause, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, createSelectColumn } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  useTimeEntries,
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useCreateTimeEntry,
  useBulkDeleteTimeEntries,
  useTimeTrackingSummary,
  type TimeEntryWithRelations,
} from "@/hooks/use-time-tracking";
import { useTasks } from "@/hooks/use-tasks";
import { useItems } from "@/hooks/use-items";
import { useContacts } from "@/hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format, differenceInSeconds } from "date-fns";

export default function TimeTracking() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStartTimerDialogOpen, setIsStartTimerDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<TimeEntryWithRelations[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [timerFormData, setTimerFormData] = useState({
    description: "",
    is_billable: true,
    hourly_rate: "",
    task_id: "",
    item_id: "",
    contact_id: "",
  });

  const [manualFormData, setManualFormData] = useState({
    description: "",
    start_time: "",
    end_time: "",
    is_billable: true,
    hourly_rate: "",
    task_id: "",
    item_id: "",
    contact_id: "",
  });

  const { data: timeEntries = [], isLoading, error } = useTimeEntries();
  const { data: activeTimer } = useActiveTimer();
  const { data: tasks = [] } = useTasks();
  const { data: items = [] } = useItems();
  const { data: contacts = [] } = useContacts();
  const { data: summary } = useTimeTrackingSummary();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const createTimeEntry = useCreateTimeEntry();
  const bulkDeleteTimeEntries = useBulkDeleteTimeEntries();
  const { toast } = useToast();

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const resetTimerForm = () => {
    setTimerFormData({
      description: "",
      is_billable: true,
      hourly_rate: "",
      task_id: "",
      item_id: "",
      contact_id: "",
    });
  };

  const resetManualForm = () => {
    setManualFormData({
      description: "",
      start_time: "",
      end_time: "",
      is_billable: true,
      hourly_rate: "",
      task_id: "",
      item_id: "",
      contact_id: "",
    });
  };

  const handleStartTimer = async () => {
    if (!timerFormData.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await startTimer.mutateAsync({
        description: timerFormData.description,
        is_billable: timerFormData.is_billable,
        hourly_rate: timerFormData.hourly_rate ? parseFloat(timerFormData.hourly_rate) : undefined,
        task_id: timerFormData.task_id || undefined,
        item_id: timerFormData.item_id || undefined,
        contact_id: timerFormData.contact_id || undefined,
      });

      toast({
        title: "Success",
        description: "Timer started",
      });
      setIsStartTimerDialogOpen(false);
      resetTimerForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      await stopTimer.mutateAsync(activeTimer.id);
      toast({
        title: "Success",
        description: "Timer stopped",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  const handleCreateManualEntry = async () => {
    if (!manualFormData.description.trim() || !manualFormData.start_time || !manualFormData.end_time) {
      toast({
        title: "Error",
        description: "Description, start time, and end time are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTimeEntry.mutateAsync({
        description: manualFormData.description,
        start_time: manualFormData.start_time,
        end_time: manualFormData.end_time,
        is_billable: manualFormData.is_billable,
        hourly_rate: manualFormData.hourly_rate ? parseFloat(manualFormData.hourly_rate) : undefined,
        task_id: manualFormData.task_id || undefined,
        item_id: manualFormData.item_id || undefined,
        contact_id: manualFormData.contact_id || undefined,
      });

      toast({
        title: "Success",
        description: "Time entry created",
      });
      setIsCreateDialogOpen(false);
      resetManualForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create time entry",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteTimeEntries.mutateAsync(selectedRows.map((r) => r.id));
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} time entry(ies)`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete time entries",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getElapsedTime = () => {
    if (!activeTimer) return "0h 0m 0s";
    const startTime = new Date(activeTimer.start_time);
    const seconds = differenceInSeconds(currentTime, startTime);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const columns: ColumnDef<TimeEntryWithRelations>[] = [
    createSelectColumn<TimeEntryWithRelations>(),
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("description")}</div>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original.user;
        return user?.full_name || "-";
      },
    },
    {
      accessorKey: "start_time",
      header: "Start",
      cell: ({ row }) => {
        const date = row.getValue("start_time") as string;
        return format(new Date(date), "dd MMM yyyy HH:mm");
      },
    },
    {
      accessorKey: "end_time",
      header: "End",
      cell: ({ row }) => {
        const date = row.getValue("end_time") as string | null;
        if (!date) return <Badge variant="secondary">Running</Badge>;
        return format(new Date(date), "dd MMM yyyy HH:mm");
      },
    },
    {
      accessorKey: "duration_minutes",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("duration_minutes") as number | null;
        return formatDuration(duration);
      },
    },
    {
      accessorKey: "is_billable",
      header: "Billable",
      cell: ({ row }) => {
        const billable = row.getValue("is_billable") as boolean;
        return billable ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        );
      },
    },
    {
      accessorKey: "billed_amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("billed_amount") as number | null;
        if (!amount) return <span className="text-muted-foreground">-</span>;
        return <span>£{amount.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: "is_invoiced",
      header: "Status",
      cell: ({ row }) => {
        const invoiced = row.getValue("is_invoiced") as boolean;
        return invoiced ? (
          <Badge variant="secondary">Invoiced</Badge>
        ) : (
          <Badge variant="outline">Not Invoiced</Badge>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
          Error loading time entries. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track billable hours and manage time entries
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRows.length > 0 && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedRows.length})
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Manual Time Entry</DialogTitle>
                <DialogDescription>
                  Add a completed time entry manually
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-description">Description *</Label>
                  <Textarea
                    id="manual-description"
                    value={manualFormData.description}
                    onChange={(e) => setManualFormData({ ...manualFormData, description: e.target.value })}
                    placeholder="What did you work on?"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-start">Start Time *</Label>
                    <Input
                      id="manual-start"
                      type="datetime-local"
                      value={manualFormData.start_time}
                      onChange={(e) => setManualFormData({ ...manualFormData, start_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-end">End Time *</Label>
                    <Input
                      id="manual-end"
                      type="datetime-local"
                      value={manualFormData.end_time}
                      onChange={(e) => setManualFormData({ ...manualFormData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="manual-billable"
                    checked={manualFormData.is_billable}
                    onCheckedChange={(checked) => setManualFormData({ ...manualFormData, is_billable: checked })}
                  />
                  <Label htmlFor="manual-billable">Billable</Label>
                </div>

                {manualFormData.is_billable && (
                  <div className="space-y-2">
                    <Label htmlFor="manual-rate">Hourly Rate (£)</Label>
                    <Input
                      id="manual-rate"
                      type="number"
                      step="0.01"
                      value={manualFormData.hourly_rate}
                      onChange={(e) => setManualFormData({ ...manualFormData, hourly_rate: e.target.value })}
                      placeholder="e.g., 75.00"
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-task">Task</Label>
                    <Select
                      value={manualFormData.task_id}
                      onValueChange={(value) => setManualFormData({ ...manualFormData, task_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-item">Item</Label>
                    <Select
                      value={manualFormData.item_id}
                      onValueChange={(value) => setManualFormData({ ...manualFormData, item_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-contact">Contact</Label>
                    <Select
                      value={manualFormData.contact_id}
                      onValueChange={(value) => setManualFormData({ ...manualFormData, contact_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateManualEntry} disabled={createTimeEntry.isPending}>
                  {createTimeEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {activeTimer ? (
            <Button className="gap-2" onClick={handleStopTimer}>
              <Pause className="h-4 w-4" />
              Stop Timer
            </Button>
          ) : (
            <Dialog open={isStartTimerDialogOpen} onOpenChange={setIsStartTimerDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Timer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Start Time Tracking</DialogTitle>
                  <DialogDescription>
                    Start tracking time for a task
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="timer-description">Description *</Label>
                    <Textarea
                      id="timer-description"
                      value={timerFormData.description}
                      onChange={(e) => setTimerFormData({ ...timerFormData, description: e.target.value })}
                      placeholder="What are you working on?"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="timer-billable"
                      checked={timerFormData.is_billable}
                      onCheckedChange={(checked) => setTimerFormData({ ...timerFormData, is_billable: checked })}
                    />
                    <Label htmlFor="timer-billable">Billable</Label>
                  </div>

                  {timerFormData.is_billable && (
                    <div className="space-y-2">
                      <Label htmlFor="timer-rate">Hourly Rate (£)</Label>
                      <Input
                        id="timer-rate"
                        type="number"
                        step="0.01"
                        value={timerFormData.hourly_rate}
                        onChange={(e) => setTimerFormData({ ...timerFormData, hourly_rate: e.target.value })}
                        placeholder="e.g., 75.00"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timer-task">Task</Label>
                      <Select
                        value={timerFormData.task_id}
                        onValueChange={(value) => setTimerFormData({ ...timerFormData, task_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timer-item">Item</Label>
                      <Select
                        value={timerFormData.item_id}
                        onValueChange={(value) => setTimerFormData({ ...timerFormData, item_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timer-contact">Contact</Label>
                      <Select
                        value={timerFormData.contact_id}
                        onValueChange={(value) => setTimerFormData({ ...timerFormData, contact_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsStartTimerDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartTimer} disabled={startTimer.isPending}>
                    {startTimer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Start Timer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Active Timer Card */}
      {activeTimer && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-pulse text-primary" />
              Timer Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{activeTimer.description}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Started at {format(new Date(activeTimer.start_time), "HH:mm")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{getElapsedTime()}</p>
                {activeTimer.hourly_rate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Rate: £{activeTimer.hourly_rate}/hr
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Billable Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBillableHours.toFixed(1)}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{summary.totalBilled.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invoiced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">£{summary.totalInvoiced.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unbilled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">£{summary.totalUninvoiced.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Grid */}
      <DataTable
        columns={columns}
        data={timeEntries}
        searchKey="description"
        searchPlaceholder="Search time entries..."
        onRowSelectionChange={setSelectedRows}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.length} time entry(ies)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteTimeEntries.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
