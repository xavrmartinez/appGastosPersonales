"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Landmark,
  LayoutDashboard,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/deudas", label: "Deudas", icon: Landmark },
  { href: "/tarjetas", label: "Tarjetas", icon: CreditCard },
  { href: "/hormiga", label: "Hormiga", icon: ShoppingBag },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  className,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function AppNav() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex items-start justify-between gap-2 border-b px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold">Gastos Personales</h1>
            <p className="text-sm text-muted-foreground">Resumen mensual</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </aside>

      <div className="fixed top-4 right-4 z-50 md:hidden">
        <ThemeToggle />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card md:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              className="flex-col gap-1 px-2 py-2 text-xs"
            />
          ))}
        </div>
      </nav>
    </>
  );
}
