import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  Folder,
  Loader2,
  Search,
  Grid3x3,
  List,
} from "lucide-react";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDownloadDocument,
  useGetDocumentUrl,
  useFolders,
  useBulkDeleteDocuments,
  type DocumentWithRelations,
} from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Documents() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentWithRelations | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState("general");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  const { data: documents = [], isLoading } = useDocuments(
    selectedFolder !== "all" ? { folder: selectedFolder } : undefined
  );
  const { data: folders = [] } = useFolders();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const bulkDeleteDocuments = useBulkDeleteDocuments();
  const downloadDocument = useDownloadDocument();
  const getDocumentUrl = useGetDocumentUrl();

  // Filter documents by search
  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setIsUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      await uploadDocument.mutateAsync({
        file: uploadFile,
        folder: uploadFolder,
        description: uploadDescription || undefined,
        tags: uploadTags ? uploadTags.split(',').map(t => t.trim()) : undefined,
      });

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setUploadFolder("general");
      setUploadDescription("");
      setUploadTags("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      await bulkDeleteDocuments.mutateAsync(selectedDocuments);
      toast({
        title: "Success",
        description: `Deleted ${selectedDocuments.length} document(s)`,
      });
      setSelectedDocuments([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete documents",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (doc: DocumentWithRelations) => {
    try {
      const url = await getDocumentUrl.mutateAsync(doc.id);
      setPreviewUrl(url);
      setPreviewDocument(doc);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load preview",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadDocument.mutateAsync(id);
      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocuments(prev =>
      prev.includes(id)
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload, organize, and manage your files
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDocuments.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedDocuments.length})
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-[200px]">
            <Folder className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents Grid/List View - abbreviated for brevity */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No documents yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Upload your first document to get started
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className={`cursor-pointer hover:border-primary transition-colors ${
                selectedDocuments.includes(doc.id) ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => toggleDocumentSelection(doc.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getFileIcon(doc.file_type)}
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(doc)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDocumentToDelete(doc.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-medium text-sm mb-2 truncate" title={doc.file_name}>
                  {doc.file_name}
                </h3>

                {doc.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(doc.created_at), "dd MMM yyyy")}</span>
                  <Badge variant="secondary" className="text-xs">
                    {doc.folder}
                  </Badge>
                </div>

                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to your library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadFile && (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                {getFileIcon(uploadFile.type)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadFile.size)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="photos">Photos</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated, optional)</Label>
              <Input
                id="tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., important, urgent, lease"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadDocument.isPending}>
              {uploadDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => {
        setPreviewUrl(null);
        setPreviewDocument(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.file_name}</DialogTitle>
          </DialogHeader>
          {previewUrl && previewDocument && (
            <div className="space-y-4">
              {previewDocument.file_type.startsWith('image/') ? (
                <img src={previewUrl} alt={previewDocument.file_name} className="w-full rounded-lg" />
              ) : previewDocument.file_type.includes('pdf') ? (
                <iframe src={previewUrl} className="w-full h-[600px] rounded-lg" />
              ) : (
                <div className="text-center py-12">
                  <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Preview not available for this file type</p>
                  <Button className="mt-4" onClick={() => handleDownload(previewDocument.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {documentToDelete
                ? "Are you sure you want to delete this document? This action cannot be undone."
                : `Are you sure you want to delete ${selectedDocuments.length} document(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDocumentToDelete(null);
              setIsDeleteDialogOpen(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete ? handleDelete(documentToDelete) : handleBulkDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(deleteDocument.isPending || bulkDeleteDocuments.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
