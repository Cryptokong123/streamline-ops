import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, ChevronLeft, ChevronRight, Loader2, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCalendarEntries,
  useTeamCalendar,
  useCreateCalendarEntry,
  useUpdateCalendarEntry,
  useDeleteCalendarEntry,
  useAddAttendees
} from "@/hooks/use-calendar";
import { useTeamMembers } from "@/hooks/use-tasks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([user?.id || ""]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form state for new calendar entry
  const [newEntry, setNewEntry] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    color: "#3b82f6",
    is_all_day: false,
  });
  const [newEntryAttendees, setNewEntryAttendees] = useState<string[]>([]);

  const { data: teamMembers } = useTeamMembers();
  const createEntry = useCreateCalendarEntry();

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, view]);

  // Fetch calendar entries
  const { data: calendarEntries, isLoading } = useCalendarEntries(dateRange.start, dateRange.end);
  const { data: teamCalendarData } = useTeamCalendar(selectedUsers, dateRange.start, dateRange.end);

  // Generate days for the current view
  const days = useMemo(() => {
    const result = [];
    const start = view === "week" ? dateRange.start : dateRange.start;
    const days = view === "week" ? 7 : 35; // 5 weeks for month view

    for (let i = 0; i < days; i++) {
      result.push(addDays(start, i));
    }
    return result;
  }, [dateRange, view]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleCreateEntry = async () => {
    if (!newEntry.title.trim()) {
      toast({
        title: "Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return;
    }

    if (!newEntry.start_time || !newEntry.end_time) {
      toast({
        title: "Error",
        description: "Start and end times are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEntry.mutateAsync({
        entry: {
          ...newEntry,
          start_time: new Date(newEntry.start_time).toISOString(),
          end_time: new Date(newEntry.end_time).toISOString(),
        },
        attendeeIds: newEntryAttendees,
      });

      toast({
        title: "Success",
        description: "Calendar entry created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewEntry({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        color: "#3b82f6",
        is_all_day: false,
      });
      setNewEntryAttendees([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create calendar entry",
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

  const getEntriesForDay = (day: Date) => {
    return calendarEntries?.filter((entry) => {
      const entryDate = new Date(entry.start_time);
      return isSameDay(entryDate, day);
    }) || [];
  };

  const getEntriesForHour = (day: Date, hour: number) => {
    const entries = getEntriesForDay(day);
    return entries.filter((entry) => {
      const entryStart = new Date(entry.start_time);
      return entryStart.getHours() === hour;
    });
  };

  const handlePrevious = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, -7));
    } else {
      setCurrentDate((prev) => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, 7));
    } else {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleQuickAdd = (day: Date, hour?: number) => {
    const start = new Date(day);
    if (hour !== undefined) {
      start.setHours(hour, 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }

    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    setNewEntry({
      ...newEntry,
      start_time: start.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
    });
    setSelectedDate(day);
    setIsCreateDialogOpen(true);
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
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View and manage team schedules
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Calendar Event</DialogTitle>
              <DialogDescription>
                Add a new event to the calendar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Event title"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Event description"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={newEntry.start_time}
                    onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newEntry.end_time}
                    onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Meeting room, address, or video link"
                  value={newEntry.location}
                  onChange={(e) => setNewEntry({ ...newEntry, location: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_all_day"
                  checked={newEntry.is_all_day}
                  onCheckedChange={(checked) =>
                    setNewEntry({ ...newEntry, is_all_day: checked as boolean })
                  }
                />
                <Label htmlFor="is_all_day" className="cursor-pointer">
                  All day event
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={newEntry.color}
                  onChange={(e) => setNewEntry({ ...newEntry, color: e.target.value })}
                  className="h-10 w-20"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Attendees</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-3">
                    {teamMembers?.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`attendee-${member.id}`}
                          checked={newEntryAttendees.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewEntryAttendees([...newEntryAttendees, member.id]);
                            } else {
                              setNewEntryAttendees(newEntryAttendees.filter((id) => id !== member.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`attendee-${member.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEntry} disabled={createEntry.isPending}>
                {createEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <h2 className="text-lg font-semibold ml-4">
                {format(currentDate, view === "week" ? "MMMM yyyy" : "MMMM yyyy")}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={view === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("week")}
                >
                  Week
                </Button>
                <Button
                  variant={view === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("month")}
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Member Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Show Calendars</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teamMembers?.map((member) => (
              <Badge
                key={member.id}
                variant={selectedUsers.includes(member.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedUsers.includes(member.id)) {
                    setSelectedUsers(selectedUsers.filter((id) => id !== member.id));
                  } else {
                    setSelectedUsers([...selectedUsers, member.id]);
                  }
                }}
              >
                <Avatar className="h-4 w-4 mr-2">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                {member.full_name || "Unknown"}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Week View */}
      {view === "week" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Days header */}
                <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
                  <div className="p-4 border-r text-sm font-medium text-muted-foreground">
                    Time
                  </div>
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="p-4 border-r text-center"
                    >
                      <div className="text-sm font-medium">
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          isSameDay(day, new Date())
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time slots */}
                <ScrollArea className="h-[600px]">
                  {hours.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                      <div className="p-2 border-r text-sm text-muted-foreground">
                        {format(new Date().setHours(hour, 0), "ha")}
                      </div>
                      {days.map((day) => {
                        const entries = getEntriesForHour(day, hour);
                        return (
                          <div
                            key={day.toISOString()}
                            className="border-r p-1 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleQuickAdd(day, hour)}
                          >
                            {entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-2 rounded text-xs mb-1 text-white"
                                style={{ backgroundColor: entry.color || "#3b82f6" }}
                              >
                                <div className="font-medium truncate">{entry.title}</div>
                                <div className="opacity-90 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(entry.start_time), "h:mm a")}
                                </div>
                                {entry.location && (
                                  <div className="opacity-90 flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3" />
                                    {entry.location}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {view === "month" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="p-4 border-b border-r text-center font-medium text-sm">
                  {day}
                </div>
              ))}
              {days.map((day) => {
                const entries = getEntriesForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border-b border-r ${
                      !isCurrentMonth ? "bg-muted/30" : ""
                    } ${isToday ? "bg-primary/5" : ""} hover:bg-muted/50 cursor-pointer transition-colors`}
                    onClick={() => handleQuickAdd(day)}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {entries.slice(0, 3).map((entry) => (
                        <div
                          key={entry.id}
                          className="text-xs p-1 rounded text-white truncate"
                          style={{ backgroundColor: entry.color || "#3b82f6" }}
                        >
                          {entry.title}
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{entries.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
