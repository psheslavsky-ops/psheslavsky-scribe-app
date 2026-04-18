import { supabase } from "@/integrations/supabase/client";

export const lovable = {
  auth: {
    async signInWithOAuth(
      provider: "google",
      options?: { redirect_uri?: string; extraParams?: Record<string, string> }
    ) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirect_uri,
          queryParams: options?.extraParams,
        },
      });
      return { error };
    },
  },
};
