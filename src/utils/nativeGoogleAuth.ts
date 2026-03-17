import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

let GoogleAuth: any = null;

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const initializeGoogleAuth = async () => {
  if (!isNativePlatform()) return;
  
  try {
    const module = await import("@codetrix-studio/capacitor-google-auth");
    GoogleAuth = module.GoogleAuth;
    
    GoogleAuth.initialize({
      clientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com", // Replace with your Google Web Client ID
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
  } catch (error) {
    console.error("Failed to initialize GoogleAuth:", error);
  }
};

export const nativeGoogleSignIn = async (): Promise<{ error?: Error }> => {
  if (!GoogleAuth) {
    await initializeGoogleAuth();
  }
  
  if (!GoogleAuth) {
    return { error: new Error("Google Auth not available on this platform") };
  }

  try {
    const user = await GoogleAuth.signIn();
    
    if (!user?.authentication?.idToken) {
      return { error: new Error("No ID token received from Google") };
    }

    // Use the ID token to sign in with Supabase
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: user.authentication.idToken,
      access_token: user.authentication.accessToken,
    });

    if (error) {
      return { error };
    }

    return {};
  } catch (error) {
    console.error("Native Google Sign-In error:", error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
};
