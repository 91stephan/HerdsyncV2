import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StaffRole =
  | "system_admin"
  | "center_manager"
  | "district_officer"
  | "veterinarian"
  | "field_worker";

export interface Profile {
  id: string;
  full_name: string | null;
  role: StaffRole;
  district_id: string | null;
  breeding_center_id: string | null;
  phone: string | null;
  employee_number: string | null;
  active: boolean;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  role: StaffRole | null;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  canViewDistrict: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  role: null,
  isAdmin: false,
  isManagerOrAbove: false,
  canViewDistrict: false,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoading(false);
      });
  }, [user?.id]);

  const role = profile?.role ?? null;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        role,
        isAdmin: role === "system_admin",
        isManagerOrAbove: role === "system_admin" || role === "center_manager" || role === "district_officer",
        canViewDistrict: role !== null,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
