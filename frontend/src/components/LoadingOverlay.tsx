import { Spinner } from './ui/spinner';

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <Spinner className="size-16 text-primary" />
    </div>
  );
}
