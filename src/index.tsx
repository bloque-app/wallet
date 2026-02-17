import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from './components/ui/sonner';
import { Spinner } from './components/ui/spinner';
import { ThemeProvider } from './components/ui/theme-provider';
import {
  type AuthContextProps,
  AuthProvider,
  useAuth,
} from './contexts/auth/auth-context';
import { initBloque } from './lib/bloque';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: undefined as unknown as {
    auth: AuthContextProps;
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const auth = useAuth();
  const [isBloqueReady, setIsBloqueReady] = React.useState(false);

  React.useEffect(() => {
    if (!auth.isAuthenticated) {
      setIsBloqueReady(true);
      return;
    }

    let isMounted = true;
    setIsBloqueReady(false);
    initBloque()
      .then(() => {
        if (isMounted) {
          setIsBloqueReady(true);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize Bloque SDK', error);
        if (isMounted) {
          setIsBloqueReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [auth.isAuthenticated]);

  if (auth.loading) return <Spinner />;
  if (!isBloqueReady) return <Spinner />;

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Toaster richColors closeButton expand />
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
