import { Clock } from 'lucide-react';

interface Props {
  timeLeft: string;
}

export function TurnTimer({ timeLeft }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span className="font-medium">{timeLeft}</span>
    </div>
  );
}
