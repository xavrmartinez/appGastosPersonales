import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ResumenSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="space-y-2 text-center">
          <div className="mx-auto h-7 w-40 rounded bg-muted" />
          <div className="mx-auto h-4 w-28 rounded bg-muted" />
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-28 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="h-7 w-20 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="h-14 rounded-lg border bg-card px-4 py-3"
              >
                <div className="h-4 w-48 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
