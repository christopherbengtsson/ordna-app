import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingWaitingRoom() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-none">
        <Skeleton className="h-10 md:h-11 w-40 md:w-48 mb-4 md:mb-6" />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
            {/* Header skeleton */}
            <div className="text-center space-y-2">
              <Skeleton className="h-8 md:h-10 w-64 mx-auto" />
              <Skeleton className="h-4 md:h-5 w-80 max-w-full mx-auto" />
            </div>

            {/* Current Turn card skeleton */}
            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 md:h-20 w-full" />
              </CardContent>
            </Card>

            {/* Scoreboard skeleton */}
            <Skeleton className="h-48 md:h-64 w-full rounded-lg" />
          </div>
        </div>
      </Card>
    </div>
  );
}
