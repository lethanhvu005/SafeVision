import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import './styles.css';
import { router } from './app/router';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeProvider } from './theme/ThemeProvider';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ThemeToggle />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
