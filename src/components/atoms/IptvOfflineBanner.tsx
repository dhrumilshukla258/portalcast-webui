import React from 'react';
import { WifiOff } from 'lucide-react';
import { useIptvOffline } from '@/utils/iptvHealth';

/** Shown while the server cannot reach the IPTV portal; local-library titles keep playing. */
const IptvOfflineBanner: React.FC = () => {
  const offline = useIptvOffline();
  if (!offline) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-amber-700/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <WifiOff size={16} /> IPTV is offline · your library still plays
    </div>
  );
};

export default IptvOfflineBanner;
