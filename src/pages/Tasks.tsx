import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, User, Users, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useAssignTask, useTeamMembers } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Form state for new task
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
  });

  const { data: tasks, isLoading, error } = useTasks();
  const { data: teamMembers } = useTeamMembers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const assignTask = useAssignTask();
  const { toast } = useToast();

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTask.mutateAsync(newTask);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
        status: "todo",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleAssignTask = async () => {
    if (!selectedTaskForAssignment) return;

    try {
      await assignTask.mutateAsync({
        taskId: selectedTaskForAssignment,
        userIds: selectedAssignees,
      });
      toast({
        title: "Success",
        description: "Task assignments updated successfully",
      });
      setSelectedTaskForAssignment(null);
      setSelectedAssignees([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates: { status: newStatus },
      });
      toast({
        title: "Success",
        description: "Task status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getTasksByStatus = (status: TaskStatus | "all") => {
    if (status === "all") return filteredTasks;
    return filteredTasks.filter((task) => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "in_progress":
        return "bg-primary/10 text-primary border-primary/20";
      case "todo":
        return "bg-muted text-muted-foreground border-border";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
    const assignedUsers = task.task_assignments?.map((a) => a.user) || [];
    const hasAssignments = assignedUsers.length > 0;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm items-center">
                {task.due_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {hasAssignments && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex -space-x-2">
                      {assignedUsers.slice(0, 3).map((user) => (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {assignedUsers.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                          +{assignedUsers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Dialog open={selectedTaskForAssignment === task.id} onOpenChange={(open) => {
                  if (!open) {
                    setSelectedTaskForAssignment(null);
                    setSelectedAssignees([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTaskForAssignment(task.id);
                        setSelectedAssignees(task.task_assignments?.map((a) => a.user_id) || []);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {hasAssignments ? "Manage" : "Assign"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Team Members</DialogTitle>
                      <DialogDescription>
                        Select team members to assign to this task
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {teamMembers?.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={member.id}
                            checked={selectedAssignees.includes(member.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAssignees([...selectedAssignees, member.id]);
                              } else {
                                setSelectedAssignees(selectedAssignees.filter((id) => id !== member.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={member.id}
                            className="flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTaskForAssignment(null);
                          setSelectedAssignees([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAssignTask} disabled={assignTask.isPending}>
                        {assignTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Assignments
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <Badge
                variant="outline"
                className={getPriorityColor(task.priority || "medium")}
              >
                {task.priority}
              </Badge>
              <Select
                value={task.status || "todo"}
                onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <Badge
                    variant="outline"
                    className={getStatusColor(task.status || "todo")}
                  >
                    {(task.status || "todo").replace('_', ' ')}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load tasks. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your to-do list
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your to-do list
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: TaskPriority) =>
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({getTasksByStatus("all").length})</TabsTrigger>
          <TabsTrigger value="todo">To Do ({getTasksByStatus("todo").length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({getTasksByStatus("in_progress").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({getTasksByStatus("completed").length})</TabsTrigger>
        </TabsList>

        {["all", "todo", "in_progress", "completed"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {getTasksByStatus(status as TaskStatus | "all").length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No tasks found</p>
                </CardContent>
              </Card>
            ) : (
              getTasksByStatus(status as TaskStatus | "all").map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
