import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/supabase/authProvider';
import { Toaster } from '@/components/ui/sonner';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/locales/i18n';
import { App } from './App';

const IS_DARK_MODE = window.matchMedia('(prefers-color-scheme:dark)').matches;
document.documentElement.classList.toggle('dark', IS_DARK_MODE);

const queryClient = new QueryClient();

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Toaster />
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
