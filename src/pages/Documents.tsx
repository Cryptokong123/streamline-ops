import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Search, FileText, Download, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const documents = [
    { 
      id: 1, 
      name: "Gas Safety Certificate - 12 Oak Street.pdf",
      type: "gas_safety",
      uploadedAt: "2025-10-15",
      property: "12 Oak Street",
      extractedDate: "2026-10-15"
    },
    { 
      id: 2, 
      name: "Tenancy Agreement - Apt 4B.pdf",
      type: "tenancy_agreement",
      uploadedAt: "2025-09-01",
      property: "Apartment 4B",
      extractedDate: "2026-08-31"
    },
    { 
      id: 3, 
      name: "EPC Certificate - Riverside Complex.pdf",
      type: "epc",
      uploadedAt: "2025-08-20",
      property: "Riverside Complex",
      extractedDate: "2035-08-20"
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "gas_safety":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "epc":
        return "bg-success/10 text-success border-success/20";
      case "tenancy_agreement":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage certificates, agreements, and important files
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {doc.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      <span>Property: {doc.property}</span>
                      <span>•</span>
                      <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className={getTypeColor(doc.type)}
                    >
                      {doc.type.replace('_', ' ')}
                    </Badge>
                    {doc.extractedDate && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Expires: {new Date(doc.extractedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
