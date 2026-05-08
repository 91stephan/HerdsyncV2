import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";

export const EQUIPMENT_TYPES = [
  "Tractor",
  "Planter",
  "Harvester",
  "Trailer",
  "Irrigation",
  "Sprayer",
  "Loader",
  "Baler",
  "Cultivator",
  "Other",
] as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[number];

export const EQUIPMENT_CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Under Repair"] as const;
export type EquipmentCondition = typeof EQUIPMENT_CONDITIONS[number];

export interface FarmEquipment {
  id: string;
  farm_id: string;
  name: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_cost: number;
  current_value: number | null;
  condition: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFarmEquipment() {
  const { farm } = useFarm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.farmEquipment.byFarm(farm?.id);

  const { data: equipment = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!farm?.id) return [] as FarmEquipment[];
      const { data, error } = await supabase
        .from("farm_equipment")
        .select("*")
        .eq("farm_id", farm.id)
        .order("equipment_type", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as FarmEquipment[];
    },
    enabled: !!farm?.id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const addEquipment = async (item: Omit<FarmEquipment, "id" | "farm_id" | "created_at" | "updated_at">) => {
    if (!farm?.id) return null;
    const { data, error } = await supabase
      .from("farm_equipment")
      .insert({ farm_id: farm.id, ...item })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Equipment Added", description: `${item.name} has been added to your equipment.` });
    invalidate();
    return data;
  };

  const updateEquipment = async (id: string, updates: Partial<FarmEquipment>) => {
    const { error } = await supabase.from("farm_equipment").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Equipment Updated", description: "Equipment has been updated." });
    invalidate();
    return true;
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase.from("farm_equipment").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Equipment Deleted", description: "Equipment has been removed." });
    invalidate();
    return true;
  };

  const getTotalValue = () =>
    equipment.reduce((sum, item) => sum + (item.current_value || item.purchase_cost || 0), 0);

  const getEquipmentByType = (type: string) =>
    equipment.filter((item) => item.equipment_type === type);

  const getEquipmentPurchasedInMonth = (year: number, month: number) =>
    equipment.filter((item) => {
      if (!item.purchase_date) return false;
      const purchaseDate = new Date(item.purchase_date);
      return purchaseDate.getFullYear() === year && purchaseDate.getMonth() === month;
    });

  return {
    equipment,
    loading,
    fetchEquipment: refetch,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    getTotalValue,
    getEquipmentByType,
    getEquipmentPurchasedInMonth,
  };
}
