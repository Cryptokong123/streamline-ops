import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

interface Invite {
  id: string;
  business_id: string;
  role: string;
  invited_by: string;
  created_at: string;
  businesses: {
    name: string;
  };
}

export function InviteNotification() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && !profile?.business_id) {
      checkForInvites();
    }
  }, [user, profile]);

  const checkForInvites = async () => {
    const { data } = await supabase
      .from("invites")
      .select(`
        *,
        businesses (
          name
        )
      `)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setInvite(data as Invite);
      setOpen(true);
    }
  };

  const handleAccept = async () => {
    if (!invite) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("accept_invite", {
        invite_id: invite.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; business_id?: string };

      if (result?.success) {
        toast({
          title: "Invite accepted!",
          description: `Welcome to ${invite.businesses.name}`,
        });
        await refreshProfile();
        setOpen(false);
      } else {
        throw new Error(result?.message || "Failed to accept invite");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!invite) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("invites")
        .update({ status: "declined" })
        .eq("id", invite.id);

      if (error) throw error;

      toast({
        title: "Invite declined",
        description: "You can accept it later if you change your mind",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!invite) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            You've been invited!
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold">{invite.businesses.name}</span> has invited you
            to join their workspace as a <span className="font-semibold">{invite.role}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={loading}
          >
            Decline
          </Button>
          <Button onClick={handleAccept} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
