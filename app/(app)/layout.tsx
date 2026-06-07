import { AppNav } from "@/components/app-nav";
import { SWRProvider } from "@/components/swr-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <div className="flex min-h-screen bg-background">
        <AppNav />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </SWRProvider>
  );
}
