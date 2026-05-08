/**
 * Centralized React Query key registry.
 *
 * Why this exists:
 * - One source of truth for cache keys → no typos, no drift.
 * - Hierarchical tuples enable broad invalidation
 *   (e.g. invalidate all `["animals"]` to refresh every farm's animals).
 * - Functions accept `undefined` so callers don't need pre-checks; the
 *   matching `enabled` flag in `useQuery` should still gate the actual fetch.
 *
 * Convention: top-level entity name + optional sub-scope.
 *   queryKeys.animals.byFarm(farmId)         // ['animals', farmId]
 *   queryKeys.inventory.usageLog(farmId)     // ['inventory-usage-log', farmId]
 *
 * To invalidate everything for an entity, use the `.all` tuple:
 *   qc.invalidateQueries({ queryKey: queryKeys.animals.all })
 */
export const queryKeys = {
  animals: {
    all: ["animals"] as const,
    byFarm: (farmId?: string) => ["animals", farmId] as const,
  },

  inventory: {
    all: ["inventory"] as const,
    byFarm: (farmId?: string) => ["inventory", farmId] as const,
    usageLog: (farmId?: string) => ["inventory-usage-log", farmId] as const,
  },

  farms: {
    all: ["farms"] as const,
    byUser: (userId?: string) => ["farms", userId] as const,
  },

  subscription: {
    all: ["subscription"] as const,
    byUserFarm: (userId?: string, farmId?: string) =>
      ["subscription", userId, farmId] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    byUser: (userId?: string) => ["notifications", userId] as const,
  },

  employees: {
    all: ["employees"] as const,
    byFarm: (farmId?: string) => ["employees", farmId] as const,
    activeByFarm: (farmId?: string) => ["employees-active", farmId] as const,
    usersByFarm: (farmId?: string) => ["employee-users", farmId] as const,
    managersByFarm: (farmId?: string) => ["farm-managers", farmId] as const,
    usernamesByFarm: (farmId?: string) =>
      ["employee-usernames", farmId] as const,
    tasksByFarm: (farmId?: string) => ["employee-tasks", farmId] as const,
  },

  dailyTasks: {
    all: ["daily-tasks"] as const,
    byFarm: (farmId?: string) => ["daily-tasks", farmId] as const,
    completions: (farmId?: string, since?: string) =>
      ["daily-task-completions", farmId, since] as const,
    completionsAll: (farmId?: string) =>
      ["daily-task-completions", farmId] as const,
  },

  animalSales: {
    all: ["animal-sales"] as const,
    byFarm: (farmId?: string) => ["animal-sales", farmId] as const,
  },

  farmEquipment: {
    all: ["farm-equipment"] as const,
    byFarm: (farmId?: string) => ["farm-equipment", farmId] as const,
  },

  farmExpenses: {
    all: ["farm-expenses"] as const,
    byFarm: (farmId?: string) => ["farm-expenses", farmId] as const,
  },

  invitations: {
    all: ["farm-invitations"] as const,
    byFarm: (farmId?: string) => ["farm-invitations", farmId] as const,
  },

  invitedUsers: {
    all: ["farm-invited-users"] as const,
    byFarm: (farmId?: string) => ["farm-invited-users", farmId] as const,
  },

  monthlyCompliance: {
    checklists: (farmId?: string, monthYear?: string) =>
      ["monthly-compliance", farmId, monthYear] as const,
    history: (farmId?: string) =>
      ["monthly-compliance-history", farmId] as const,
  },

  askAProUsage: (userId?: string, farmId?: string, date?: string) =>
    ["ask-a-pro-usage", userId, farmId, date] as const,

  marketPrices: {
    all: ["market-prices"] as const,
  },
} as const;
