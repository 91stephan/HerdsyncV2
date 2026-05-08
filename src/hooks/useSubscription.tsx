import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useFarm } from "./useFarm";
import { queryKeys } from "@/lib/queryKeys";

type SubscriptionTier = "basic" | "starter" | "pro";
type SubscriptionStatus = "trialing" | "active" | "cancelled" | "expired" | "past_due";

interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string;
  current_period_end: string | null;
  animal_limit: number;
  days_remaining: number;
}

interface AdminInfo {
  isAdmin: boolean;
  assignedTier: SubscriptionTier | null;
}

interface SubscriptionData {
  subscription: Subscription | null;
  adminInfo: AdminInfo;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: Error | null;
  isActive: boolean;
  isTrialing: boolean;
  daysRemaining: number;
  adminInfo: AdminInfo;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  error: null,
  isActive: false,
  isTrialing: false,
  daysRemaining: 0,
  adminInfo: { isAdmin: false, assignedTier: null },
  refetch: async () => {},
});

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  basic: 80,
  starter: 250,
  pro: 999999,
};

const subscriptionKey = queryKeys.subscription.byUserFarm;

async function fetchSubscriptionQuery(userId: string, farmId: string): Promise<SubscriptionData> {
  // Admin check
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role, assigned_tier")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!roleData;
  const adminInfo: AdminInfo = isAdmin
    ? { isAdmin: true, assignedTier: (roleData!.assigned_tier as SubscriptionTier | null) ?? null }
    : { isAdmin: false, assignedTier: null };

  if (isAdmin) {
    await supabase.rpc("auto_renew_admin_subscription", { _user_id: userId });
  }

  const { data: existingData, error: existingError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("farm_id", farmId)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    console.error("Error fetching subscription:", existingError);
    return { subscription: null, adminInfo };
  }

  if (!existingData) {
    const { data: newSub, error: createError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        farm_id: farmId,
        tier: "basic",
        status: "trialing",
        animal_limit: TIER_LIMITS.basic,
      })
      .select()
      .single();

    if (createError || !newSub) {
      console.error("Error creating subscription:", createError);
      return { subscription: null, adminInfo };
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(newSub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
      subscription: {
        id: newSub.id,
        tier: newSub.tier as SubscriptionTier,
        status: newSub.status as SubscriptionStatus,
        trial_ends_at: newSub.trial_ends_at,
        current_period_end: newSub.current_period_end,
        animal_limit: newSub.animal_limit,
        days_remaining: daysRemaining,
      },
      adminInfo,
    };
  }

  let daysRemaining: number;
  if (existingData.status === "active" && existingData.current_period_end) {
    daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(existingData.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
  } else {
    daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(existingData.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
  }

  if (
    existingData.status === "trialing" &&
    new Date(existingData.trial_ends_at) < new Date()
  ) {
    await supabase.from("subscriptions").update({ status: "expired" }).eq("id", existingData.id);
    existingData.status = "expired";
  }

  return {
    subscription: {
      id: existingData.id,
      tier: existingData.tier as SubscriptionTier,
      status: existingData.status as SubscriptionStatus,
      trial_ends_at: existingData.trial_ends_at,
      current_period_end: existingData.current_period_end,
      animal_limit: existingData.animal_limit,
      days_remaining: daysRemaining,
    },
    adminInfo,
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { farm } = useFarm();
  const qc = useQueryClient();

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: subscriptionKey(user?.id, farm?.id),
    queryFn: async () => {
      try {
        return await fetchSubscriptionQuery(user!.id, farm!.id);
      } catch (err) {
        console.error("Subscription fetch failed:", err);
        // Graceful fallback so the app never crashes from a query failure
        return {
          subscription: null,
          adminInfo: { isAdmin: false, assignedTier: null },
        } as SubscriptionData;
      }
    },
    enabled: !!user && !!farm,
    staleTime: 60_000,
    retry: 1,
  });

  const subscription = data?.subscription ?? null;
  const adminInfo = data?.adminInfo ?? { isAdmin: false, assignedTier: null };

  const isActive =
    subscription?.status === "active" ||
    (subscription?.status === "trialing" && subscription.days_remaining > 0);

  const isTrialing =
    subscription?.status === "trialing" && subscription.days_remaining > 0;

  const refetchWrapper = async () => {
    await refetch();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading: !!user && !!farm && isLoading,
        error: (error as Error | null) ?? null,
        isActive,
        isTrialing,
        daysRemaining: subscription?.days_remaining || 0,
        adminInfo,
        refetch: refetchWrapper,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
