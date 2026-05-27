// context/ProfileContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchProfile } from "../services/profileServices";
import { UserProfile } from "../types/Dashboard";

interface ProfileContextValue {
  profile: UserProfile | null;
  profileLoading: boolean;
  /** Call this after the user saves changes in ProfileEditor */
  refreshProfile: () => Promise<void>;
  setProfileDirect: (p: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  profileLoading: true,
  refreshProfile: async () => {},
  setProfileDirect: () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    try {
      const data = await fetchProfile(token);
      setProfile(data);
    } catch (err) {
      console.error("[ProfileContext] Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Re-fetch whenever the logged-in user changes
  useEffect(() => {
    setProfileLoading(true);
    loadProfile();
  }, [loadProfile]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        profileLoading,
        refreshProfile: loadProfile,
        // lets ProfileEditor push an update without a round-trip
        setProfileDirect: setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);