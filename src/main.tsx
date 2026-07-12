import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/App';
import { SocketProvider } from '@/context/SocketContext.tsx';
import { AuthProvider } from '@/context/AuthContext.tsx';
import { HashRouter } from 'react-router-dom';
import ErrorBoundary from '@/components/organisms/ErrorBoundary';
import { webPlatformAdapter } from '@/api/platform';
import { setPlatformAdapter } from '@/api/config';
import { setClientPlatformAdapter } from '@/api/client';

// Wire the web platform adapter (localStorage-backed token storage,
// clientType resolved via isTizenDevice()) into the networking layer. A
// native client port would call these with its own adapter instead.
setPlatformAdapter(webPlatformAdapter);
setClientPlatformAdapter(webPlatformAdapter);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
