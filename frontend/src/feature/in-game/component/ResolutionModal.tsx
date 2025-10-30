import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Crown } from 'lucide-react';

interface RoundResolutionModalProps {
  open: boolean;
  onClose: () => void;
  result: {
    playerName: string;
    gotMark: boolean;
    nextPlayer: string;
    sequence: string[];
  };
}

export function RoundResolutionModal({
  open,
  onClose,
  result,
}: RoundResolutionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-card border-border/50 shadow-glow">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="w-6 h-6 text-warning" />
            Round Resolution
          </DialogTitle>
          <DialogDescription>
            The round has ended. Here's what happened:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
            <p className="text-sm text-muted-foreground mb-2">
              Final Sequence:
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {result.sequence.map((letter, index) => (
                <div
                  key={index}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-card border border-accent/50"
                >
                  <span className="text-lg font-bold text-accent">
                    {letter}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-destructive/20 border border-destructive/50">
            <p className="font-semibold text-destructive">
              {result.playerName} received a mark!
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/20 border border-primary/50">
            <p className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span>
                Next round starts with: <strong>{result.nextPlayer}</strong>
              </span>
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all"
          >
            Start Next Round
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
