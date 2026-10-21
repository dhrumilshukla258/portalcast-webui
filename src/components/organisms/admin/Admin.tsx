import React, { useCallback, useState } from 'react';
import { ArrowLeft, LogOut, LayoutDashboard, Users, Film, Satellite, Server } from 'lucide-react';
import ProfileManager from '@/components/organisms/admin/ProfileManager';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/organisms/admin/UserManager';
import ContentManager from '@/components/organisms/admin/ContentManager';
import AdminStats from '@/components/organisms/admin/AdminStats';
import ApiReference from '@/components/organisms/admin/ApiReference';
import ConfigTab from '@/components/organisms/admin/ConfigTab';
import LogsTab from '@/components/organisms/admin/LogsTab';
import BrokenStreams from '@/components/organisms/admin/BrokenStreams';
import SecurityTab from '@/components/organisms/admin/SecurityTab';
import SettingsTab from '@/components/organisms/admin/SettingsTab';
import LibrariesTab from '@/components/organisms/admin/LibrariesTab';
import AdminOverview, { type AdminTarget } from '@/components/organisms/admin/AdminOverview';

/**
 * Admin: five sections instead of eleven tabs, each with its pages. Overview is the calm
 * front page (health, what needs the admin, who is watching); everything else is one level
 * deeper. The last section and page are remembered in this browser.
 */
interface Page {
  id: string;
  label: string;
  render: () => React.ReactNode;
}
interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  pages: Page[];
}

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, pages: [] },
  { id: 'people', label: 'People', icon: Users, pages: [{ id: 'users', label: 'Users', render: () => <UserManager /> }] },
  {
    id: 'content', label: 'Content', icon: Film, pages: [
      { id: 'libraries', label: 'Local libraries', render: () => <LibrariesTab /> },
      { id: 'content', label: 'Categories & titles', render: () => <ContentManager /> },
    ],
  },
  {
    id: 'iptv', label: 'IPTV', icon: Satellite, pages: [
      { id: 'provider', label: 'Provider', render: () => <ConfigTab /> },
      { id: 'profiles', label: 'Profiles', render: () => <ProfileManager /> },
      { id: 'activity', label: 'Activity', render: () => <AdminStats /> },
      { id: 'broken', label: 'Broken streams', render: () => <BrokenStreams /> },
    ],
  },
  {
    id: 'server', label: 'Server', icon: Server, pages: [
      { id: 'settings', label: 'Settings & jobs', render: () => <SettingsTab /> },
      { id: 'security', label: 'Security', render: () => <SecurityTab /> },
      { id: 'logs', label: 'Logs', render: () => <LogsTab /> },
      { id: 'api', label: 'API', render: () => <ApiReference /> },
    ],
  },
];

const STORE_KEY = 'portalcast.admin.place';

function savedPlace(): AdminTarget {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    const sec = SECTIONS.find((s) => s.id === v?.section);
    if (sec) return { section: sec.id, page: sec.pages.find((p) => p.id === v.page)?.id ?? sec.pages[0]?.id ?? '' };
  } catch { /* first visit or storage blocked */ }
  return { section: 'overview', page: '' };
}

interface AdminProps {
  onBack?: () => void;
}

const Admin: React.FC<AdminProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [place, setPlace] = useState<AdminTarget>(savedPlace);

  const go = useCallback((t: AdminTarget) => {
    const sec = SECTIONS.find((s) => s.id === t.section) ?? SECTIONS[0];
    const next = { section: sec.id, page: sec.pages.find((p) => p.id === t.page)?.id ?? sec.pages[0]?.id ?? '' };
    setPlace(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* not remembered */ }
  }, []);

  const section = SECTIONS.find((s) => s.id === place.section) ?? SECTIONS[0];
  const page = section.pages.find((p) => p.id === place.page) ?? section.pages[0];

  const back = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="text-gray-200 selection:bg-blue-500/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:gap-10">
        {/* Sections: a side menu on wide screens, a row of chips on narrow ones */}
        <aside className="md:sticky md:top-6 md:h-fit md:w-48 md:shrink-0">
          <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
            <h1 className="text-lg font-bold text-white">Admin</h1>
            <div className="flex gap-1 md:mt-3">
              <button
                type="button"
                onClick={back}
                data-focusable="true"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={14} /> Back to TV
              </button>
              <button
                type="button"
                onClick={() => logout()}
                data-focusable="true"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-white/5 hover:text-red-400"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          </div>
          <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <ul className="flex gap-1 md:flex-col">
              {SECTIONS.map((s) => {
                const active = s.id === section.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => go({ section: s.id, page: '' })}
                      data-focusable="true"
                      aria-current={active ? 'page' : undefined}
                      className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? 'bg-white/10 font-semibold text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      <s.icon size={16} className={active ? 'text-sky-400' : 'text-gray-500'} />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          {/* Pages of the section: plain underlined text, only when there is more than one */}
          {section.pages.length > 1 && (
            <nav aria-label={`${section.label} pages`} className="-mx-4 mb-6 overflow-x-auto border-b border-white/5 px-4 md:mx-0 md:px-0">
              <ul className="flex gap-5">
                {section.pages.map((p) => {
                  const active = p.id === page?.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => go({ section: section.id, page: p.id })}
                        data-focusable="true"
                        aria-current={active ? 'page' : undefined}
                        className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                          active ? 'border-sky-400 font-semibold text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          {section.id === 'overview' ? <AdminOverview onOpen={go} /> : page?.render()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
