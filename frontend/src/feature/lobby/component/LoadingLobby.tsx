import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingLobby() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto">
      <Card className="flex-1 w-full p-4 md:p-6 shadow-card border-none">
        <Skeleton className="h-10 md:h-11 w-40 md:w-48 mb-4 md:mb-6" />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 md:h-10 w-48 md:w-64 mx-auto" />
              <Skeleton className="h-4 md:h-5 w-32 md:w-40 mx-auto" />
            </div>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 w-11" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-12 md:h-14 w-full" />
                  <Skeleton className="h-12 md:h-14 w-full" />
                </div>
              </CardContent>
            </Card>

            <Skeleton className="h-11 md:h-12 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}
