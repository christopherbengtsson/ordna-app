import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AuthProvider } from '@/lib/supabase/authProvider';
import { Toaster } from '@/components/ui/sonner';
import { App } from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const IS_DARK_MODE = window.matchMedia('(prefers-color-scheme:dark)').matches;
document.documentElement.classList.toggle('dark', IS_DARK_MODE);

const queryClient = new QueryClient();

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster />
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
