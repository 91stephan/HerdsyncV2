import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Farm {
  id: string;
  name: string;
  owner_id: string;
  address: string | null;
  province: string | null;
}

interface EmployeeInfo {
  farmId: string;
  employeeUserId: string;
}

interface FarmsQueryResult {
  farms: Farm[];
  isEmployee: boolean;
  employeeInfo: EmployeeInfo | null;
}

interface FarmContextType {
  farm: Farm | null;
  farms: Farm[];
  loading: boolean;
  error: Error | null;
  isEmployee: boolean;
  employeeInfo: EmployeeInfo | null;
  setActiveFarm: (farmId: string) => void;
  refetchFarms: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType>({
  farm: null,
  farms: [],
  loading: true,
  error: null,
  isEmployee: false,
  employeeInfo: null,
  setActiveFarm: () => {},
  refetchFarms: async () => {},
});

const farmsKey = (userId: string | undefined) => ["farms", userId] as const;

async function fetchFarmsQuery(userId: string): Promise<FarmsQueryResult> {
  // Check if user is an employee
  const { data: employeeData } = await supabase
    .from("employee_users")
    .select("id, farm_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (employeeData) {
    const { data: farmData } = await supabase
      .from("farms")
      .select("*")
      .eq("id", employeeData.farm_id)
      .maybeSingle();

    return {
      farms: farmData ? [farmData as Farm] : [],
      isEmployee: true,
      employeeInfo: {
        farmId: employeeData.farm_id,
        employeeUserId: employeeData.id,
      },
    };
  }

  const [ownedFarmsRes, invitedFarmIdsRes] = await Promise.all([
    supabase
      .from("farms")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("farm_invited_users")
      .select("farm_id")
      .eq("user_id", userId),
  ]);

  const ownedFarms = (ownedFarmsRes.data || []) as Farm[];
  const invitedFarmIds = invitedFarmIdsRes.data;

  let invitedFarms: Farm[] = [];
  if (invitedFarmIds && invitedFarmIds.length > 0) {
    const farmIds = invitedFarmIds.map((f) => f.farm_id);
    const { data: farms } = await supabase.from("farms").select("*").in("id", farmIds);
    invitedFarms = (farms || []) as Farm[];
  }

  const allFarms = [...ownedFarms, ...invitedFarms];
  const uniqueFarms = allFarms.filter(
    (farmItem, index, self) => index === self.findIndex((f) => f.id === farmItem.id)
  );

  return { farms: uniqueFarms, isEmployee: false, employeeInfo: null };
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: farmsKey(user?.id),
    queryFn: () => fetchFarmsQuery(user!.id),
    enabled: !!user && !authLoading,
    staleTime: 60_000,
  });

  const farms = data?.farms ?? [];
  const isEmployee = data?.isEmployee ?? false;
  const employeeInfo = data?.employeeInfo ?? null;

  // Pick active farm (first if none selected, or preserve if still in list)
  const farm = useMemo<Farm | null>(() => {
    if (farms.length === 0) return null;
    if (activeFarmId) {
      const found = farms.find((f) => f.id === activeFarmId);
      if (found) return found;
    }
    return farms[0];
  }, [farms, activeFarmId]);

  // Clear cache when user logs out
  useEffect(() => {
    if (!user && !authLoading) {
      qc.removeQueries({ queryKey: ["farms"] });
      setActiveFarmId(null);
    }
  }, [user, authLoading, qc]);

  const setActiveFarm = (farmId: string) => {
    if (isEmployee && employeeInfo && farmId !== employeeInfo.farmId) return;
    if (farms.some((f) => f.id === farmId)) {
      setActiveFarmId(farmId);
    }
  };

  const refetchFarms = async () => {
    await refetch();
  };

  return (
    <FarmContext.Provider
      value={{
        farm,
        farms,
        loading: authLoading || (!!user && isLoading),
        isEmployee,
        employeeInfo,
        setActiveFarm,
        refetchFarms,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  return useContext(FarmContext);
}
