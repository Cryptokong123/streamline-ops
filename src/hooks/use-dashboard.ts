import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDashboardStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      // Fetch all stats in parallel
      const [contactsRes, propertiesRes, tasksRes, upcomingTasksRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", profile.business_id),

        supabase
          .from("properties")
          .select("id, status", { count: "exact" })
          .eq("business_id", profile.business_id),

        supabase
          .from("tasks")
          .select("id, status, priority")
          .eq("business_id", profile.business_id),

        supabase
          .from("tasks")
          .select("id, title, due_date, priority, status")
          .eq("business_id", profile.business_id)
          .gte("due_date", new Date().toISOString())
          .order("due_date", { ascending: true })
          .limit(5),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (upcomingTasksRes.error) throw upcomingTasksRes.error;

      // Calculate task statistics
      const tasks = tasksRes.data || [];
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === "todo").length,
        inProgress: tasks.filter(t => t.status === "in_progress").length,
        completed: tasks.filter(t => t.status === "completed").length,
        urgent: tasks.filter(t => t.priority === "urgent").length,
        high: tasks.filter(t => t.priority === "high").length,
      };

      // Calculate property statistics
      const properties = propertiesRes.data || [];
      const propertyStats = {
        total: propertiesRes.count || 0,
        available: properties.filter(p => p.status === "available").length,
        occupied: properties.filter(p => p.status === "occupied").length,
        maintenance: properties.filter(p => p.status === "maintenance").length,
        offline: properties.filter(p => p.status === "offline").length,
      };

      return {
        totalContacts: contactsRes.count || 0,
        totalProperties: propertiesRes.count || 0,
        taskStats,
        propertyStats,
        upcomingTasks: upcomingTasksRes.data || [],
      };
    },
    enabled: !!profile?.business_id,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useRecentActivity() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["recent-activity", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      // Fetch recent activity from task_activity table
      const { data, error } = await supabase
        .from("task_activity")
        .select(`
          *,
          task:tasks!task_activity_task_id_fkey(id, title),
          user:profiles!task_activity_user_id_fkey(id, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return data || [];
    },
    enabled: !!profile?.business_id,
  });
}
