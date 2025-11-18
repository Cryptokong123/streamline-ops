import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const contacts = [
    { 
      id: 1, 
      name: "Sarah Johnson", 
      type: "tenant", 
      email: "sarah.j@email.com", 
      phone: "07700 900123",
      address: "12 Oak Street, London"
    },
    { 
      id: 2, 
      name: "Michael Brown", 
      type: "landlord", 
      email: "m.brown@email.com", 
      phone: "07700 900456",
      address: "Various properties"
    },
    { 
      id: 3, 
      name: "Emma Wilson", 
      type: "contractor", 
      email: "emma.w@email.com", 
      phone: "07700 900789",
      address: "Trade Services Ltd"
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "tenant":
        return "bg-primary/10 text-primary border-primary/20";
      case "landlord":
        return "bg-accent/10 text-accent border-accent/20";
      case "contractor":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tenants, landlords, and contractors
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{contact.name}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`mt-2 ${getTypeColor(contact.type)}`}
                  >
                    {contact.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{contact.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{contact.address}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
