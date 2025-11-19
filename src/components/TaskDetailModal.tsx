import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Loader2, Send, Clock, User as UserIcon, Calendar, Flag, MessageSquare, History } from "lucide-react";
import { useUpdateTask, useTeamMembers } from "@/hooks/use-tasks";
import { useTaskComments, useTaskActivity, useCreateTaskComment } from "@/hooks/use-task-comments";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";

type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  task_assignments?: Array<{
    user: { id: string; full_name: string | null; avatar_url: string | null };
  }>;
};

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  const updateTask = useUpdateTask();
  const createComment = useCreateTaskComment();
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(task?.id || "");
  const { data: activity = [], isLoading: activityLoading } = useTaskActivity(task?.id || "");
  const { data: teamMembers = [] } = useTeamMembers();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSaveChanges = async () => {
    if (!task) return;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: editedTask,
      });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
      setEditedTask({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    // Extract mentions from comment (simple @username detection)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      const mentioned = teamMembers.find(
        (m) => m.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentioned) mentions.push(mentioned.id);
    }

    try {
      await createComment.mutateAsync({
        taskId: task.id,
        content: newComment,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
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

  const getActivityMessage = (activity: typeof activity[0]) => {
    const changes = activity.changes as any;
    switch (activity.action) {
      case "status_changed":
        return `changed status from ${changes?.old} to ${changes?.new}`;
      case "priority_changed":
        return `changed priority from ${changes?.old} to ${changes?.new}`;
      case "assignment_changed":
        return "updated task assignment";
      default:
        return activity.action;
    }
  };

  if (!task) return null;

  const currentTask = { ...task, ...editedTask };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTask.title ?? task.title}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="text-2xl font-bold h-auto border-0 px-0 focus-visible:ring-0"
                />
              ) : (
                <DialogTitle className="text-2xl">{currentTask.title}</DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSaveChanges} disabled={updateTask.isPending}>
                    {updateTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditedTask({});
                  }}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 m-0 p-6 overflow-auto">
              <div className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description ?? task.description ?? ""}
                      onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      rows={4}
                      placeholder="Add a description..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {currentTask.description || "No description"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Status
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editedTask.status ?? task.status ?? "todo"}
                        onValueChange={(value: TaskStatus) =>
                          setEditedTask({ ...editedTask, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={getStatusColor(currentTask.status || "todo")}>
                        {(currentTask.status || "todo").replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Priority
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editedTask.priority ?? task.priority ?? "medium"}
                        onValueChange={(value: TaskPriority) =>
                          setEditedTask({ ...editedTask, priority: value })
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
                    ) : (
                      <Badge variant="outline" className={getPriorityColor(currentTask.priority || "medium")}>
                        {currentTask.priority || "medium"}
                      </Badge>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedTask.due_date ?? task.due_date ?? ""}
                        onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                      />
                    ) : currentTask.due_date ? (
                      <p className="text-sm">{format(new Date(currentTask.due_date), "PPP")}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No due date</p>
                    )}
                  </div>

                  {/* Time Estimate */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Estimate (minutes)
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedTask.time_estimate_minutes ?? task.time_estimate_minutes ?? ""}
                        onChange={(e) =>
                          setEditedTask({ ...editedTask, time_estimate_minutes: parseInt(e.target.value) || null })
                        }
                        placeholder="Estimate in minutes"
                      />
                    ) : currentTask.time_estimate_minutes ? (
                      <p className="text-sm">{currentTask.time_estimate_minutes} minutes</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No estimate</p>
                    )}
                  </div>
                </div>

                {/* Assigned Users */}
                {!isEditing && task.task_assignments && task.task_assignments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Assigned To
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {task.task_assignments.map((assignment) => (
                        <div key={assignment.user.id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(assignment.user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignment.user.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="flex-1 m-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-6">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.user.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="p-6">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment... (use @name to mention someone)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createComment.isPending}
                  >
                    {createComment.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Cmd/Ctrl + Enter to send
                </p>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 m-0 overflow-auto">
              <ScrollArea className="h-full p-6">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activity.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(item.user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.user.full_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {getActivityMessage(item)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
