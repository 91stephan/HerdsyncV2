import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useFarm } from "./useFarm";
import { useSubscription } from "./useSubscription";
import { queryKeys } from "@/lib/queryKeys";

const TIER_LIMITS = {
  basic: 5,
  starter: 20,
  pro: Infinity,
};

interface AskAProUsage {
  questionsUsed: number;
  questionsRemaining: number;
  dailyLimit: number;
  canAsk: boolean;
  isUnlimited: boolean;
  loading: boolean;
  incrementUsage: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useAskAProUsage(): AskAProUsage {
  const { user } = useAuth();
  const { farm } = useFarm();
  const { subscription, isActive } = useSubscription();
  const queryClient = useQueryClient();

  const tier = subscription?.tier || "basic";
  const dailyLimit = TIER_LIMITS[tier] || TIER_LIMITS.basic;
  const isUnlimited = tier === "pro";
  const today = new Date().toISOString().split("T")[0];
  const queryKey = queryKeys.askAProUsage(user?.id, farm?.id, today);

  const { data: questionsUsed = 0, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !farm) return 0;
      const { data, error } = await supabase
        .from("ask_a_pro_usage")
        .select("question_count")
        .eq("user_id", user.id)
        .eq("farm_id", farm.id)
        .eq("usage_date", today)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data?.question_count || 0;
    },
    enabled: !!user && !!farm,
  });

  const questionsRemaining = isUnlimited ? Infinity : Math.max(0, dailyLimit - questionsUsed);
  const canAsk = isActive && (isUnlimited || questionsRemaining > 0);

  const incrementUsage = async (): Promise<boolean> => {
    if (!user || !farm) return false;
    if (!canAsk) return false;
    try {
      const { data: existing } = await supabase
        .from("ask_a_pro_usage")
        .select("id, question_count")
        .eq("user_id", user.id)
        .eq("farm_id", farm.id)
        .eq("usage_date", today)
        .maybeSingle();

      if (existing) {
        const newCount = existing.question_count + 1;
        if (!isUnlimited && newCount > dailyLimit) return false;
        const { error } = await supabase
          .from("ask_a_pro_usage")
          .update({ question_count: newCount })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ask_a_pro_usage").insert({
          user_id: user.id,
          farm_id: farm.id,
          usage_date: today,
          question_count: 1,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (err) {
      console.error("Failed to increment usage:", err);
      return false;
    }
  };

  return {
    questionsUsed,
    questionsRemaining,
    dailyLimit,
    canAsk,
    isUnlimited,
    loading,
    incrementUsage,
    refetch: async () => {
      await refetch();
    },
  };
}
