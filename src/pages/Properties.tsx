import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Bed, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Properties() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const properties = [
    { 
      id: 1, 
      address: "12 Oak Street, London, SW1A 1AA",
      status: "occupied",
      bedrooms: 2,
      rent: 1500,
      landlord: "Michael Brown"
    },
    { 
      id: 2, 
      address: "Apartment 4B, Riverside Complex, Manchester, M1 2AB",
      status: "available",
      bedrooms: 1,
      rent: 950,
      landlord: "Patricia Davis"
    },
    { 
      id: 3, 
      address: "156 High Street, Birmingham, B1 3CD",
      status: "maintenance",
      bedrooms: 3,
      rent: 1800,
      landlord: "Michael Brown"
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-success/10 text-success border-success/20";
      case "available":
        return "bg-primary/10 text-primary border-primary/20";
      case "maintenance":
        return "bg-warning/10 text-warning border-warning/20";
      case "offline":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property portfolio
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <CardTitle className="text-lg leading-tight">
                      {property.address}
                    </CardTitle>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`mt-3 ${getStatusColor(property.status)}`}
                  >
                    {property.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bed className="h-4 w-4" />
                  <span>{property.bedrooms} bed</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>£{property.rent}/mo</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Landlord: <span className="text-foreground font-medium">{property.landlord}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
