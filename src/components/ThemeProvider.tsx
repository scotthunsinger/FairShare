"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyTheme, parseTheme, readStoredTheme } from "@/lib/theme";

export function ThemeProvider() {
  useEffect(() => {
    applyTheme(readStoredTheme());
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const saved = data.user?.user_metadata?.theme;
      if (saved) applyTheme(parseTheme(saved));
    });
  }, []);

  return null;
}
