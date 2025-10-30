import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingGameList() {
  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 md:w-14 md:h-14 rounded-full" />
          <div>
            <Skeleton className="h-7 md:h-9 lg:h-11 w-32 md:w-40 mb-2" />
            <Skeleton className="h-3 md:h-3.5 w-20 md:w-24" />
          </div>
        </div>
        <Skeleton className="h-11 md:h-12 w-28 md:w-32" />
      </div>

      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
