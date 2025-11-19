import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  usePipelineStages,
  useDeals,
  useCreateDeal,
  useMoveDeal,
  type DealWithRelations,
} from "@/hooks/use-pipeline";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContacts } from "@/hooks/use-contacts";
import { useItems } from "@/hooks/use-items";
import { useProfiles } from "@/hooks/use-profiles";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function Pipeline() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    stage_id: "",
    probability: "50",
    expected_close_date: "",
    contact_id: "",
    item_id: "",
    assigned_to: "",
    tags: "",
  });

  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const { data: deals = [], isLoading: dealsLoading } = useDeals({ status: 'open' });
  const { data: contacts = [] } = useContacts();
  const { data: items = [] } = useItems();
  const { data: profiles = [] } = useProfiles();
  const createDeal = useCreateDeal();
  const moveDeal = useMoveDeal();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      value: "",
      stage_id: "",
      probability: "50",
      expected_close_date: "",
      contact_id: "",
      item_id: "",
      assigned_to: "",
      tags: "",
    });
  };

  const handleCreateDeal = async () => {
    if (!formData.title.trim() || !formData.stage_id) {
      toast({
        title: "Error",
        description: "Title and stage are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDeal.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        value: formData.value ? parseFloat(formData.value) : undefined,
        stage_id: formData.stage_id,
        probability: parseInt(formData.probability),
        expected_close_date: formData.expected_close_date || undefined,
        contact_id: formData.contact_id || undefined,
        item_id: formData.item_id || undefined,
        assigned_to: formData.assigned_to || undefined,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : undefined,
      });

      toast({
        title: "Success",
        description: "Deal created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      await moveDeal.mutateAsync({
        dealId: draggableId,
        stageId: destination.droppableId,
      });

      toast({
        title: "Success",
        description: "Deal moved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move deal",
        variant: "destructive",
      });
    }
  };

  const getDealsByStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId);
  };

  const calculateStageValue = (stageId: string) => {
    return getDealsByStage(stageId).reduce((sum, deal) => sum + (deal.value || 0), 0);
  };

  if (stagesLoading || dealsLoading) {
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
          <h1 className="text-3xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track deals through your sales process
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Manage Stages
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
                <DialogDescription>
                  Add a new deal to your sales pipeline
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-title">Title *</Label>
                    <Input
                      id="create-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., New enterprise contract"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-value">Deal Value (£)</Label>
                    <Input
                      id="create-value"
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="e.g., 50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-stage">Stage *</Label>
                    <Select
                      value={formData.stage_id}
                      onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-probability">Probability (%)</Label>
                    <Input
                      id="create-probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-close-date">Expected Close Date</Label>
                    <Input
                      id="create-close-date"
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-contact">Contact</Label>
                    <Select
                      value={formData.contact_id}
                      onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-item">Related Item</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-assigned">Assigned To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-tags">Tags (comma-separated)</Label>
                    <Input
                      id="create-tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., enterprise, priority, q1"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDeal} disabled={createDeal.isPending}>
                  {createDeal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Deal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{deals.reduce((sum, deal) => sum + (deal.value || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{deals.length > 0 ? Math.round(deals.reduce((sum, deal) => sum + (deal.value || 0), 0) / deals.length).toLocaleString() : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Close %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deals.length > 0 ? Math.round(deals.reduce((sum, deal) => sum + deal.probability, 0) / deals.length) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            const stageValue = calculateStageValue(stage.id);

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h3 className="font-semibold">{stage.name}</h3>
                      <Badge variant="secondary">{stageDeals.length}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    £{stageValue.toLocaleString()}
                  </p>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <CardContent className="p-4">
                                <h4 className="font-medium mb-2">{deal.title}</h4>
                                {deal.value && (
                                  <p className="text-sm font-semibold text-primary mb-2">
                                    £{deal.value.toLocaleString()}
                                  </p>
                                )}
                                {deal.contact && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {deal.contact.full_name}
                                  </p>
                                )}
                                {deal.expected_close_date && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Close: {format(new Date(deal.expected_close_date), "dd MMM yyyy")}
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    {deal.probability}%
                                  </Badge>
                                  {deal.assigned_user && (
                                    <div className="text-xs text-muted-foreground">
                                      {deal.assigned_user.full_name}
                                    </div>
                                  )}
                                </div>
                                {deal.tags && deal.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {deal.tags.map((tag, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
