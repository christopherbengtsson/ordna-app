import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

export const useNavigateOnError = (error: Error | null, msg: string) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      navigate({ to: '/', replace: true });
      toast.error(msg);
    }
  }, [error, msg, navigate]);
};
