import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingGame() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 md:gap-6 flex-1">
        {/* Main Game Area */}
        <div className="flex flex-col w-full">
          <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-border/50">
            {/* Centered Content Area */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
                <div className="text-center">
                  <Skeleton className="h-6 md:h-8 w-40 md:w-48 mx-auto mb-2" />
                  <Skeleton className="h-4 md:h-5 w-24 md:w-32 mx-auto" />
                </div>

                <div className="flex justify-center gap-2 md:gap-3">
                  <Skeleton className="w-12 h-16 md:w-16 md:h-20" />
                  <Skeleton className="w-12 h-16 md:w-16 md:h-20" />
                  <Skeleton className="w-12 h-16 md:w-16 md:h-20" />
                </div>
              </div>
            </div>

            {/* Action Buttons at Bottom */}
            <div className="mt-4 md:mt-6">
              <div className="space-y-3">
                <Skeleton className="h-11 md:h-12 w-full" />
                <Skeleton className="h-11 md:h-12 w-full" />
              </div>
            </div>
          </Card>
        </div>

        {/* Desktop Scoreboard */}
        <div className="hidden lg:block lg:sticky lg:top-4 h-fit">
          <Card className="p-4 shadow-card border-border/50">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
