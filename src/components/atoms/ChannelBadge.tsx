import React, { useState } from 'react';
import { URL_PATHS } from '@/api/config';

interface ChannelBadgeProps {
  channel: string;
  logo?: string | null;
  /** Logo height in px. */
  size?: number;
  className?: string;
}

/**
 * The TV channel a title airs on ("Zee5 : Manemagalu" is shown as "Manemagalu" with this
 * beside it): its logo on a dark pill, or the channel's name when there is no logo or it
 * fails to load. Same as the TV app's ChannelBadge.
 */
const ChannelBadge: React.FC<ChannelBadgeProps> = ({ channel, logo, size = 18, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const src = logo ? (logo.startsWith('http') ? logo : `${baseUrl}/api/images${logo}`) : null;
  return (
    <span className={`inline-flex items-center rounded-md bg-black/60 px-1.5 py-0.5 ${className}`} title={channel}>
      {src && !failed ? (
        <img
          src={src}
          alt={channel}
          loading="lazy"
          decoding="async"
          style={{ height: size, maxWidth: size * 3 }}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="whitespace-nowrap text-[10px] font-bold leading-4 text-white">{channel}</span>
      )}
    </span>
  );
};

export default ChannelBadge;
