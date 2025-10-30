import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingGameOver() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-none">
        <Skeleton className="h-10 w-36 mb-4 md:mb-6" />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="text-center">
              <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-12 w-64 mx-auto" />
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-40 mx-auto" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1">
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
