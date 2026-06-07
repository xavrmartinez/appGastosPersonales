"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Cambiar tema" disabled>
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Tabs value="dark">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="light" disabled>
            Claro
          </TabsTrigger>
          <TabsTrigger value="dark" disabled>
            Oscuro
          </TabsTrigger>
          <TabsTrigger value="system" disabled>
            Sistema
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <Tabs value={theme ?? "dark"} onValueChange={setTheme}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="light">
          <Sun className="size-4" />
          Claro
        </TabsTrigger>
        <TabsTrigger value="dark">
          <Moon className="size-4" />
          Oscuro
        </TabsTrigger>
        <TabsTrigger value="system">
          <Monitor className="size-4" />
          Sistema
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
