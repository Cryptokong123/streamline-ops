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
import { Loader2, Save, MessageSquare, Clock } from "lucide-react";
import { useUpdateContact } from "@/hooks/use-contacts";
import { useContactComments, useCreateContactComment } from "@/hooks/use-contact-comments";
import { useTeamMembers } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactType = Database["public"]["Enums"]["contact_type"];

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  const { toast } = useToast();
  const updateContact = useUpdateContact();
  const { data: comments = [], isLoading: isLoadingComments } = useContactComments(contact?.id || "");
  const createComment = useCreateContactComment();
  const { data: teamMembers = [] } = useTeamMembers();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "client" as ContactType,
    address: "",
    notes: "",
  });

  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        type: contact.type || "client",
        address: contact.address || "",
        notes: contact.notes || "",
      });
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;

    try {
      await updateContact.mutateAsync({
        id: contact.id,
        updates: formData,
      });
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!contact || !newComment.trim()) return;

    // Extract mentions from comment
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
        contactId: contact.id,
        content: newComment,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "client":
        return "bg-primary/10 text-primary border-primary/20";
      case "vendor":
        return "bg-accent/10 text-accent border-accent/20";
      case "partner":
        return "bg-success/10 text-success border-success/20";
      case "other":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{contact.name || "Unnamed Contact"}</span>
            <Badge variant="outline" className={getTypeColor(contact.type || "client")}>
              {contact.type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detail-name">Name *</Label>
                  <Input
                    id="detail-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-email">Email</Label>
                    <Input
                      id="detail-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-phone">Phone</Label>
                    <Input
                      id="detail-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: ContactType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-address">Address</Label>
                  <Input
                    id="detail-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-notes">Notes</Label>
                  <Textarea
                    id="detail-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={6}
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={updateContact.isPending}>
                    {updateContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments yet. Be the first to add one!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(comment.user?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.user?.full_name || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Add Comment */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="new-comment">Add Comment</Label>
              <Textarea
                id="new-comment"
                placeholder="Type your comment here... Use @name to mention team members"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || createComment.isPending}
              >
                {createComment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Comment
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
