import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Save,
  MessageSquare,
  Clock,
  Users,
  Link2,
  X,
  Plus,
  CalendarDays,
} from "lucide-react";
import { useUpdateItem, useItem, useLinkContactToItem, useUnlinkContactFromItem, useCreateItemNote, type ItemWithType } from "@/hooks/use-items";
import { useContacts } from "@/hooks/use-contacts";
import { useContactTypes, useItemTypes } from "@/hooks/use-custom-types";
import { useCreateTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

interface ItemDetailModalProps {
  item: ItemWithType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemDetailModal({ item, open, onOpenChange }: ItemDetailModalProps) {
  const { toast } = useToast();
  const updateItem = useUpdateItem();

  // Fetch full item details with relationships
  const { data: fullItem, isLoading: isLoadingItem } = useItem(item?.id || "");
  const { data: contacts = [] } = useContacts();
  const { data: contactTypes = [] } = useContactTypes();
  const { data: itemTypes = [] } = useItemTypes();

  const linkContact = useLinkContactToItem();
  const unlinkContact = useUnlinkContactFromItem();
  const createNote = useCreateItemNote();
  const createTask = useCreateTask();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type_id: "",
    address: "",
    amount: "",
    start_date: "",
    end_date: "",
    status: "",
  });

  const [newNote, setNewNote] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedRoleTypeId, setSelectedRoleTypeId] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  // Task creation form
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        description: item.description || "",
        type_id: item.type_id || "",
        address: item.address || "",
        amount: item.amount?.toString() || "",
        start_date: item.start_date ? format(new Date(item.start_date), "yyyy-MM-dd") : "",
        end_date: item.end_date ? format(new Date(item.end_date), "yyyy-MM-dd") : "",
        status: item.status || "active",
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    try {
      await updateItem.mutateAsync({
        id: item.id,
        updates: {
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        },
      });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!item || !newNote.trim()) return;

    try {
      await createNote.mutateAsync({
        itemId: item.id,
        content: newNote,
      });
      setNewNote("");
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  const handleLinkContact = async () => {
    if (!item || !selectedContactId) return;

    try {
      await linkContact.mutateAsync({
        itemId: item.id,
        contactId: selectedContactId,
        roleTypeId: selectedRoleTypeId || undefined,
        notes: linkNotes || undefined,
      });
      setSelectedContactId("");
      setSelectedRoleTypeId("");
      setLinkNotes("");
      toast({
        title: "Success",
        description: "Contact linked to item",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link contact",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkContact = async (contactId: string) => {
    if (!item) return;

    try {
      await unlinkContact.mutateAsync({
        itemId: item.id,
        contactId,
      });
      toast({
        title: "Success",
        description: "Contact unlinked from item",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink contact",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async () => {
    if (!item || !taskTitle.trim()) return;

    try {
      await createTask.mutateAsync({
        title: taskTitle,
        priority: taskPriority,
        due_date: taskDueDate || null,
        status: "todo",
        item_id: item.id,
      });
      setTaskFormOpen(false);
      setTaskTitle("");
      setTaskPriority("medium");
      setTaskDueDate("");
      toast({
        title: "Success",
        description: "Task created and linked to this item",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
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

  if (!item) return null;

  const linkedContacts = (fullItem as any)?.item_contacts || [];
  const notes = (fullItem as any)?.item_notes || [];
  const tasks = (fullItem as any)?.tasks || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{item.title || "Untitled Item"}</span>
            {item.type && (
              <Badge variant="outline" style={{ backgroundColor: item.type.color + "20", borderColor: item.type.color }}>
                {item.type.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 mr-2" />
              Contacts ({linkedContacts.length})
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="h-4 w-4 mr-2" />
              Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CalendarDays className="h-4 w-4 mr-2" />
              Tasks ({tasks.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detail-title">Title *</Label>
                  <Input
                    id="detail-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-type">Type</Label>
                    <Select
                      value={formData.type_id}
                      onValueChange={(value) => setFormData({ ...formData, type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="detail-status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-description">Description</Label>
                  <Textarea
                    id="detail-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-address">Address/Location</Label>
                  <Input
                    id="detail-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-amount">Amount (£)</Label>
                    <Input
                      id="detail-amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input disabled value="GBP" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-start-date">Start Date</Label>
                    <Input
                      id="detail-start-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-end-date">End Date</Label>
                    <Input
                      id="detail-end-date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={updateItem.isPending}>
                    {updateItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {linkedContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contacts linked yet.
                  </div>
                ) : (
                  linkedContacts.map((link: any) => (
                    <div key={link.id} className="border rounded-lg p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(link.contact?.name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{link.contact?.name || "Unknown"}</div>
                          {link.role_type && (
                            <Badge variant="outline" className="mt-1" style={{ backgroundColor: link.role_type.color + "20", borderColor: link.role_type.color }}>
                              {link.role_type.label}
                            </Badge>
                          )}
                          {link.contact?.email && (
                            <div className="text-sm text-muted-foreground mt-1">{link.contact.email}</div>
                          )}
                          {link.notes && (
                            <div className="text-sm text-muted-foreground mt-1 italic">"{link.notes}"</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkContact(link.contact_id)}
                        disabled={unlinkContact.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Link Contact Form */}
            <div className="space-y-2 border-t pt-4">
              <Label>Link Contact</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRoleTypeId} onValueChange={setSelectedRoleTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Notes (optional)"
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
              />
              <Button
                onClick={handleLinkContact}
                disabled={!selectedContactId || linkContact.isPending}
                className="w-full"
              >
                {linkContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Link2 className="h-4 w-4 mr-2" />
                Link Contact
              </Button>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {isLoadingItem ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notes yet. Add one below!
                  </div>
                ) : (
                  notes.map((note: any) => (
                    <div key={note.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(note.user?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {note.user?.full_name || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(note.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Add Note */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="new-note">Add Note</Label>
              <Textarea
                id="new-note"
                placeholder="Type your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || createNote.isPending}
              >
                {createNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Note
              </Button>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks linked to this item yet.
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                              {task.status}
                            </Badge>
                            <Badge variant="outline">{task.priority}</Badge>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Create Task Form */}
            {!taskFormOpen ? (
              <Button onClick={() => setTaskFormOpen(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Task for This Item
              </Button>
            ) : (
              <div className="space-y-2 border-t pt-4">
                <Label>Create New Task</Label>
                <Input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={taskPriority} onValueChange={(value: any) => setTaskPriority(value)}>
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
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTaskFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={!taskTitle.trim() || createTask.isPending}
                    className="flex-1"
                  >
                    {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Task
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
