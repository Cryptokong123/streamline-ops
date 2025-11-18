import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, LogOut } from "lucide-react";

export function WaitingForInvite() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Waiting for Access</CardTitle>
            <CardDescription className="mt-2">
              Your account has been created, but you need to be invited to a workspace before
              you can access the platform.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              Signed in as: <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Contact your administrator to send you an invite, or check back later.
            </p>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
