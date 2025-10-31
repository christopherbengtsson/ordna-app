import { Frown } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card } from '@/components/ui/card';

export function GameListError() {
  return (
    <div className="container mx-auto max-w-4xl">
      <Card className="shadow-card border-border/50">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Frown />
            </EmptyMedia>
            <EmptyTitle>Error</EmptyTitle>
            <EmptyDescription>
              Unable to load any games, try again by refetching the page.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent></EmptyContent>
        </Empty>
      </Card>
    </div>
  );
}
