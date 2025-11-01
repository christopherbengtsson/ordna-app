import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, Gamepad2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';

export function LoadingGameList() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-3 rounded-full">
            <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-primary">
              Orda
            </h1>
          </div>
        </div>

        <Button size="default" className="px-4 md:px-6" disabled>
          <Plus className="w-6 h-6" />
          {isDesktop && 'New Game'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Your Turn Section */}
        <div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Clock className="w-6 h-6 text-warning" />
            Your Turn
          </h2>
          <div className="grid gap-3">
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

        {/* Waiting for next player Section */}
        <div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Users className="w-6 h-6 text-info" />
            Waiting for next player
          </h2>
          <div className="grid gap-3">
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

        {/* Pending Games Section */}
        <div>
          <h2 className="text-2xl font-bold mb-3">Pending Games</h2>
          <div className="grid gap-3">
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
