import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { useFarmExpenses } from "@/hooks/useFarmExpenses";
import { useToast } from "@/hooks/use-toast";

export const INVENTORY_CATEGORIES = [
  "Feed",
  "Fuel",
  "Medicine",
  "Tools",
  "Chemicals",
  "Spare Parts",
] as const;

export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];

export interface InventoryItem {
  id: string;
  farm_id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  reorder_level: number;
  cost_per_unit: number;
  supplier: string | null;
  storage_location: string | null;
  notes: string | null;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLogEntry {
  id: string;
  inventory_id: string;
  farm_id: string;
  quantity_used: number;
  reason: string;
  used_by: string | null;
  usage_date: string;
  notes: string | null;
  created_at: string;
}

const inventoryKey = (farmId?: string) => ["inventory", farmId] as const;
const usageLogKey = (farmId?: string) => ["inventory-usage-log", farmId] as const;

export function useInventory() {
  const { farm } = useFarm();
  const { addExpense } = useFarmExpenses();
  const { toast } = useToast();
  const qc = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: inventoryKey(farm?.id),
    enabled: !!farm?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("farm_id", farm!.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching inventory:", error);
        toast({ title: "Error", description: "Failed to load inventory", variant: "destructive" });
        throw error;
      }
      return (data || []) as InventoryItem[];
    },
  });

  const usageLogQuery = useQuery({
    queryKey: usageLogKey(farm?.id),
    enabled: !!farm?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<UsageLogEntry[]> => {
      const { data, error } = await supabase
        .from("inventory_usage_log")
        .select("*")
        .eq("farm_id", farm!.id)
        .order("usage_date", { ascending: false })
        .limit(100);
      if (error) {
        console.error("Error fetching usage log:", error);
        throw error;
      }
      return (data || []) as UsageLogEntry[];
    },
  });

  const inventory = inventoryQuery.data ?? [];
  const usageLog = usageLogQuery.data ?? [];
  const loading = inventoryQuery.isLoading;

  const fetchInventory = async () => {
    await qc.invalidateQueries({ queryKey: inventoryKey(farm?.id) });
  };
  const fetchUsageLog = async () => {
    await qc.invalidateQueries({ queryKey: usageLogKey(farm?.id) });
  };

  const addItem = async (item: Omit<InventoryItem, "id" | "farm_id" | "created_at" | "updated_at">) => {
    if (!farm?.id) return null;
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        farm_id: farm.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        reorder_level: item.reorder_level,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier || null,
        storage_location: item.storage_location || null,
        notes: item.notes || null,
        last_restocked: item.last_restocked || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding inventory item:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }

    toast({ title: "Item Added", description: `${item.name} has been added to inventory.` });
    await fetchInventory();
    return data;
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const { error } = await supabase.from("inventory").update(updates).eq("id", id);
    if (error) {
      console.error("Error updating inventory item:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Item Updated", description: "Inventory item has been updated." });
    await fetchInventory();
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      console.error("Error deleting inventory item:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Item Deleted", description: "Inventory item has been removed." });
    await fetchInventory();
    return true;
  };

  const restockItem = async (
    id: string,
    quantityToAdd: number,
    costPerUnit: number,
    supplier?: string,
  ) => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return false;

    const newQuantity = item.quantity + quantityToAdd;
    const totalCost = quantityToAdd * costPerUnit;

    const { error } = await supabase
      .from("inventory")
      .update({
        quantity: newQuantity,
        cost_per_unit: costPerUnit,
        last_restocked: new Date().toISOString().split("T")[0],
        supplier: supplier || item.supplier,
      })
      .eq("id", id);

    if (error) {
      console.error("Error restocking item:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    const categoryMap: Record<string, string> = {
      "Feed": "Feed & Supplements",
      "Fuel": item.name.toLowerCase().includes("diesel") ? "Diesel" : "Petrol",
      "Medicine": "Medicine & Veterinary",
      "Tools": "Equipment & Repairs",
      "Chemicals": "Chemicals & Pesticides",
      "Spare Parts": "Equipment & Repairs",
    };

    await addExpense({
      expense_date: new Date().toISOString().split("T")[0],
      category: categoryMap[item.category] || "Other",
      description: `Restock: ${item.name} (${quantityToAdd} ${item.unit})`,
      amount: totalCost,
      supplier_vendor: supplier || item.supplier,
      receipt_reference: null,
      notes: `Auto-created from inventory restock`,
      receipt_image_url: null,
    });

    toast({
      title: "Item Restocked",
      description: `Added ${quantityToAdd} ${item.unit} of ${item.name}. Expense of R${totalCost.toFixed(2)} recorded.`,
    });

    await fetchInventory();
    return true;
  };

  const logUsage = async (
    inventoryId: string,
    quantityUsed: number,
    reason: string,
    usedBy?: string,
    notes?: string,
  ) => {
    if (!farm?.id) return false;
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) return false;

    if (quantityUsed > item.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${item.quantity} ${item.unit} available.`,
        variant: "destructive",
      });
      return false;
    }

    const { error: logError } = await supabase.from("inventory_usage_log").insert({
      inventory_id: inventoryId,
      farm_id: farm.id,
      quantity_used: quantityUsed,
      reason,
      used_by: usedBy || null,
      notes: notes || null,
    });

    if (logError) {
      console.error("Error logging usage:", logError);
      toast({ title: "Error", description: logError.message, variant: "destructive" });
      return false;
    }

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity: item.quantity - quantityUsed })
      .eq("id", inventoryId);

    if (updateError) {
      console.error("Error updating inventory:", updateError);
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return false;
    }

    toast({
      title: "Usage Logged",
      description: `Used ${quantityUsed} ${item.unit} of ${item.name}.`,
    });

    await fetchInventory();
    await fetchUsageLog();
    return true;
  };

  const getStockStatus = (item: InventoryItem) => {
    const ratio = item.quantity / item.reorder_level;
    if (item.reorder_level === 0) return { label: "No Limit", variant: "secondary" as const };
    if (ratio <= 0.5) return { label: "Critical", variant: "destructive" as const };
    if (ratio <= 1) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const getLowStockItems = () =>
    inventory.filter((item) => item.reorder_level !== 0 && item.quantity <= item.reorder_level);
  const getItemsByCategory = (category: InventoryCategory) =>
    inventory.filter((item) => item.category === category);
  const getTotalValue = () =>
    inventory.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0);

  return {
    inventory,
    usageLog,
    loading,
    fetchInventory,
    fetchUsageLog,
    addItem,
    updateItem,
    deleteItem,
    restockItem,
    logUsage,
    getStockStatus,
    getLowStockItems,
    getItemsByCategory,
    getTotalValue,
  };
}
