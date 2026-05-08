import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";

// Re-export Animal type that maps to livestock table
export interface Animal {
  id: string;
  farm_id: string;
  animal_tag_id: string; // maps to livestock.tag
  species: string; // maps to livestock.type
  breed: string | null;
  sex: string | null;
  dob_or_age: string | null; // maps to livestock.age
  color_markings: string | null;
  brand_mark: string | null;
  microchip_number: string | null;
  health_notes: string | null; // maps to livestock.notes
  status: "available" | "sold" | "deceased" | "transferred";
  name: string;
  weight: string | null;
  plannedSaleDate: string | null;
  created_at: string;
  updated_at: string;
}

const animalsKey = queryKeys.animals.byFarm;

export function useAnimals() {
  const { farm } = useFarm();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: animalsKey(farm?.id),
    enabled: !!farm?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<Animal[]> => {
      const { data, error } = await supabase
        .from("livestock")
        .select("*")
        .eq("farm_id", farm!.id)
        .order("tag", { ascending: true });

      if (error) {
        console.error("Error fetching animals:", error);
        toast({ title: "Error", description: "Failed to load animals", variant: "destructive" });
        throw error;
      }

      return (data || []).map((livestock) => ({
        id: livestock.id,
        farm_id: livestock.farm_id,
        animal_tag_id: livestock.tag,
        species: livestock.type,
        breed: livestock.breed,
        sex: livestock.sex ?? null,
        dob_or_age: livestock.date_of_birth ?? livestock.age,
        color_markings: livestock.color_markings ?? null,
        brand_mark: livestock.brand_mark ?? null,
        microchip_number: livestock.microchip_number ?? null,
        health_notes: livestock.notes,
        status: livestock.sold_at ? "sold" : "available",
        name: livestock.name,
        weight: livestock.weight,
        plannedSaleDate: livestock.planned_sale_date,
        created_at: livestock.created_at,
        updated_at: livestock.updated_at,
      }));
    },
  });

  const animals = query.data ?? [];
  const loading = query.isLoading;

  // Realtime: invalidate cache when livestock rows change for this farm
  useEffect(() => {
    if (!farm?.id) return;
    const channel = supabase
      .channel(`livestock-${farm.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "livestock", filter: `farm_id=eq.${farm.id}` },
        () => {
          qc.invalidateQueries({ queryKey: animalsKey(farm.id) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [farm?.id, qc]);

  const fetchAnimals = async () => {
    await qc.invalidateQueries({ queryKey: animalsKey(farm?.id) });
  };

  const getAvailableAnimals = () => animals.filter((a) => a.status === "available");

  const markAnimalsSoldWithPrices = async (
    items: { animal_id: string; unit_price: number | null }[],
    soldTo?: string,
  ) => {
    const now = new Date().toISOString();
    const results = await Promise.all(
      items.map((item) =>
        supabase
          .from("livestock")
          .update({
            sold_at: now,
            sale_price: item.unit_price || null,
            sold_to: soldTo || null,
          })
          .eq("id", item.animal_id),
      ),
    );
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Error marking animals as sold:", errors);
      toast({ title: "Error", description: "Failed to update some animals", variant: "destructive" });
      return false;
    }
    await fetchAnimals();
    return true;
  };

  const markAnimalsSold = async (animalIds: string[], salePrice?: number, soldTo?: string) => {
    const { error } = await supabase
      .from("livestock")
      .update({
        sold_at: new Date().toISOString(),
        sale_price: salePrice || null,
        sold_to: soldTo || null,
      })
      .in("id", animalIds);

    if (error) {
      console.error("Error marking animals as sold:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchAnimals();
    return true;
  };

  return {
    animals,
    loading,
    fetchAnimals,
    getAvailableAnimals,
    markAnimalsSold,
    markAnimalsSoldWithPrices,
  };
}
