import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineIndicator from '@/components/OfflineIndicator';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <OfflineIndicator />
          <App />
        </ErrorBoundary>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#2C3E2D',
              color: '#FDFCFA',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Source Sans 3, sans-serif'
            },
            success: {
              iconTheme: {
                primary: '#8FBC8F',
                secondary: '#FDFCFA'
              }
            },
            error: {
              iconTheme: {
                primary: '#CD7F6E',
                secondary: '#FDFCFA'
              }
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

