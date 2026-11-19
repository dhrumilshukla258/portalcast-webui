import React from 'react';
import { useVideoContext } from '@/context/video';
import { BackArrowIcon, CopyLinkIcon, DownloadIcon } from '@/components/atoms/Icons';

interface TopBarProps {
  onBack: () => void;
  /** The decoded video ("2160p · 24 fps · 3840×2160"), at the right end of the same row. */
  stats?: string | null;
}

export const TopBar = React.memo<TopBarProps>(({ onBack, stats }) => {
  const { handleCopyLink, handleDownload, copied, isTizen, contentType } =
    useVideoContext();

  const badge = stats && (
    <div className="ml-auto rounded-md bg-black/60 px-3 py-1 text-xs font-semibold tracking-wide text-white md:text-sm">
      {stats}
    </div>
  );
  // TVs have no buttons up here, only the badge.
  if (isTizen) return badge ? <div className="top-bar-container absolute left-0 right-0 top-0 flex p-2 md:p-4">{badge}</div> : null;
  return (
    <div className="top-bar-container pointer-events-auto absolute left-0 right-0 top-0 p-2 md:p-4">
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          data-focusable="true"
          onClick={onBack}
          className="flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-3 py-1.5 text-sm text-white shadow-xs backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95 md:px-4 md:py-2 md:text-base"
        >
          <BackArrowIcon className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
          <span className="hidden md:inline">Back</span>
        </button>

        <button
          data-focusable="true"
          onClick={handleCopyLink}
          className="relative flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-3 py-1.5 text-sm text-white shadow-xs backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95 md:px-4 md:py-2 md:text-base"
        >
          <CopyLinkIcon className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
          <span className="hidden md:inline">
            {copied ? 'Copied!' : 'Copy Link'}
          </span>
        </button>

        {contentType !== 'tv' && (
          <button
            data-focusable="true"
            onClick={handleDownload}
            className="flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-3 py-1.5 text-sm text-white shadow-xs backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95 md:px-4 md:py-2 md:text-base"
          >
            <DownloadIcon className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
            <span className="hidden md:inline">Download</span>
          </button>
        )}
        {badge}
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';
