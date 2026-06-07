import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const authError = params.error === "auth";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full flex-col items-center gap-4">
        {authError && (
          <p className="w-full max-w-md rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo iniciar sesión. Intentá de nuevo.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
