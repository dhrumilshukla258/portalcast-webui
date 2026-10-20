import React, { useState } from 'react';
import {
  Settings,
  Terminal,
  Users,
  Globe,
  LogOut,
  BarChart3,
  FolderTree,
  Code2,
  AlertTriangle, ShieldAlert, SlidersHorizontal, HardDrive } from 'lucide-react';
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

type AdminTab =
  | 'profiles'
  | 'users'
  | 'config'
  | 'logs'
  | 'stats'
  | 'content'
  | 'broken'
  | 'security'
  | 'settings'
  | 'libraries'
  | 'api';

interface AdminProps {
  onBack?: () => void;
}

const Admin: React.FC<AdminProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="text-gray-200 selection:bg-blue-500/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* --- Header & Navigation --- */}
        <header className="mb-6 flex flex-col gap-4 md:mb-8">
          {/* Title and account buttons */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Admin <span className="text-blue-500">Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-gray-500">Manage your server, users and settings.</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (window.history.state && window.history.state.view === 'admin') {
                    window.history.back();
                  } else {
                    window.history.pushState({}, '', '');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                  }
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-700/50 bg-gray-800 px-4 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-700 sm:flex-none"
                data-focusable="true"
              >
                <Globe size={16} />
                <span>Back to TV</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-900/30 bg-red-900/20 px-4 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-900/40 sm:flex-none"
                data-focusable="true"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Tabs: their own full-width row; scrolls sideways when the screen is narrow */}
          <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Admin sections">
            <div className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-1.5 backdrop-blur-md">
              {[
                { id: 'stats', label: 'Stats', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'profiles', label: 'Profiles', icon: Globe },
                { id: 'config', label: 'Provider', icon: Settings },
                { id: 'libraries', label: 'Libraries', icon: HardDrive },
                { id: 'content', label: 'Content', icon: FolderTree },
                { id: 'broken', label: 'Broken streams', icon: AlertTriangle },
                { id: 'security', label: 'Security', icon: ShieldAlert },
                { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
                { id: 'logs', label: 'Logs', icon: Terminal },
                { id: 'api', label: 'API', icon: Code2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 sm:px-4 sm:text-sm ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                  data-focusable="true"
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
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

          {activeTab === 'broken' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <BrokenStreams />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <SecurityTab />
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


          {activeTab === 'logs' && <LogsTab />}

          {activeTab === 'config' && <ConfigTab />}

          {activeTab === 'libraries' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <LibrariesTab />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SettingsTab />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Admin;
