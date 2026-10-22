import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
// Catalog reads carry the server's answer version (cached for a year at that address).
import '@/api/answerVersions';
import App from '@/App';
import { SocketProvider } from '@/context/SocketContext.tsx';
import { AuthProvider } from '@/context/AuthContext.tsx';
import { HashRouter } from 'react-router-dom';
import ErrorBoundary from '@/components/organisms/layout/ErrorBoundary';
import { webPlatformAdapter } from '@/api/platform';
import { setPlatformAdapter } from '@/api/config';
import { installStaleBuildHandler, installServiceWorkerUpdates } from '@/utils/staleBuild';
import { setClientPlatformAdapter } from '@/api/client';

// After a deploy, reload into the new build instead of failing on the old one's files.
installStaleBuildHandler();
// A new build replaces the cached one at once (not on the next visit).
installServiceWorkerUpdates();

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
