import React, { useState } from 'react';
import {
  Settings,
  Terminal,
  Users,
  Globe,
  Layout,
  LogOut,
  BarChart3,
  FolderTree,
  Code2,
} from 'lucide-react';
import ProfileManager from '@/components/organisms/admin/ProfileManager';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/organisms/admin/UserManager';
import ContentManager from '@/components/organisms/admin/ContentManager';
import AdminStats from '@/components/organisms/admin/AdminStats';
import ApiReference from '@/components/organisms/admin/ApiReference';
import CarouselConfigManager from '@/components/organisms/admin/CarouselConfigManager';
import ConfigTab from '@/components/organisms/admin/ConfigTab';
import LogsTab from '@/components/organisms/admin/LogsTab';

interface AdminProps {
  onBack?: () => void;
}

const Admin: React.FC<AdminProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profiles' | 'users' | 'config' | 'logs' | 'carousel' | 'stats' | 'content' | 'api'
  >('stats');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="text-gray-200 selection:bg-blue-500/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* --- Header & Navigation --- */}
        <header className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="mb-2 text-center md:mb-0 md:text-left">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Admin <span className="text-blue-500">Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your IPTV server configuration and logs.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <nav className="flex w-full items-center gap-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-1.5 backdrop-blur-md sm:w-auto">
              {[
                { id: 'stats', label: 'Stats', icon: BarChart3 },
                { id: 'profiles', label: 'Profiles', icon: Globe },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'content', label: 'Content', icon: FolderTree },
                { id: 'carousel', label: 'Carousel', icon: Layout },
                { id: 'config', label: 'Config', icon: Settings },
                { id: 'logs', label: 'Logs', icon: Terminal },
                { id: 'api', label: 'API', icon: Code2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | 'profiles'
                        | 'users'
                        | 'config'
                        | 'logs'
                        | 'carousel'
                        | 'stats'
                        | 'content'
                        | 'api'
                    )
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition-all duration-200 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                  data-focusable="true"
                >
                  <tab.icon size={16} className="hidden sm:inline-block" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (
                  window.history.state &&
                  window.history.state.view === 'admin'
                ) {
                  window.history.back();
                } else {
                  window.history.pushState({}, '', '');
                  window.dispatchEvent(
                    new PopStateEvent('popstate', { state: {} })
                  );
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-700/50 bg-gray-800 px-4 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-700 sm:w-auto sm:rounded-xl sm:py-2.5"
              data-focusable="true"
            >
              <Globe size={16} />
              <span>Back to TV</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-900/20 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-900/40 sm:w-auto sm:rounded-xl sm:py-2.5"
              data-focusable="true"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* --- Content Area --- */}
        <main className="transition-all duration-300">
          {activeTab === 'stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AdminStats />
            </div>
          )}

          {activeTab === 'content' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ContentManager />
            </div>
          )}

          {activeTab === 'api' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ApiReference />
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ProfileManager />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UserManager />
            </div>
          )}

          {activeTab === 'carousel' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CarouselConfigManager />
            </div>
          )}

          {activeTab === 'logs' && <LogsTab />}

          {activeTab === 'config' && <ConfigTab />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
