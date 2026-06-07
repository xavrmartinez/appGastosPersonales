import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/monthly/actions";
import { ThemeSettings } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elegí cómo se ve la aplicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajustes</CardTitle>
          <CardDescription>Tu cuenta y sesión actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Usuario</p>
            <p className="font-medium">{user?.email ?? "Sin email"}</p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
