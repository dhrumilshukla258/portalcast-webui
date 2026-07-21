import React from 'react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  purpose: string;
}

interface Group {
  title: string;
  endpoints: Endpoint[];
}

const GROUPS: Group[] = [
  {
    title: 'Auth',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', purpose: 'Email/password login' },
      { method: 'POST', path: '/api/auth/google', purpose: 'Google OAuth login' },
      { method: 'POST', path: '/api/auth/signup', purpose: 'New user self-registration' },
      { method: 'POST', path: '/api/auth/refresh', purpose: 'Exchange refresh token for a new access token' },
      { method: 'POST', path: '/api/auth/admin', purpose: 'Admin password login (ADMIN_PASSWORD)' },
      { method: 'POST', path: '/api/auth/device/code', purpose: 'Start TV device-code pairing flow' },
      { method: 'POST', path: '/api/auth/device/poll', purpose: 'TV polls for pairing approval' },
      { method: 'POST', path: '/api/auth/device/authorize', purpose: 'Approve a pending device code' },
    ],
  },
  {
    title: 'Users',
    endpoints: [
      { method: 'GET', path: '/api/admin/users', purpose: 'List all users' },
      { method: 'POST', path: '/api/admin/users', purpose: 'Create a user' },
      { method: 'PUT', path: '/api/admin/users/{id}', purpose: 'Update name/role/active/password' },
      { method: 'DELETE', path: '/api/admin/users/{id}', purpose: 'Delete a user' },
      { method: 'GET', path: '/api/admin/stats', purpose: 'User counts, recent logins, connected devices, STRM totals' },
      { method: 'GET', path: '/api/admin/streams', purpose: 'Live list of active proxy/live/VOD stream sessions' },
    ],
  },
  {
    title: 'Content Manager',
    endpoints: [
      { method: 'GET', path: '/api/admin/genres?type={channel|movie|series}', purpose: 'List categories for a content type' },
      { method: 'POST', path: '/api/admin/genres/{type}', purpose: 'Create a custom category' },
      { method: 'PUT', path: '/api/admin/genres/{type}/{id}', purpose: 'Rename/hide/show a category' },
      { method: 'DELETE', path: '/api/admin/genres/{type}/{id}', purpose: 'Delete/reset a category' },
      { method: 'PUT', path: '/api/admin/genres/{type}/reorder', purpose: 'Persist category sort order' },
      { method: 'DELETE', path: '/api/admin/genres/{type}/order', purpose: 'Restore original portal category order' },
      { method: 'GET', path: '/api/admin/items?type={type}&category_id={id}', purpose: 'List items in a category' },
      { method: 'PUT', path: '/api/admin/items/{type}/{id}', purpose: 'Rename/hide/move an item' },
      { method: 'DELETE', path: '/api/admin/items/{type}/{id}', purpose: 'Reset an item override' },
      { method: 'PUT', path: '/api/admin/items/{type}/{categoryId}/reorder', purpose: 'Persist item sort order' },
    ],
  },
  {
    title: 'Config & Cache',
    endpoints: [
      { method: 'GET', path: '/api/config', purpose: 'Read active provider config' },
      { method: 'POST', path: '/api/config', purpose: 'Update provider config (hot-reloads provider)' },
      { method: 'POST', path: '/api/clear-cache', purpose: 'Clear channel/genre/EPG/content caches' },
      { method: 'GET', path: '/api/carousel', purpose: 'Read VOD homepage carousel slides' },
    ],
  },
  {
    title: 'STRM Generation',
    endpoints: [
      { method: 'POST', path: '/api/admin/strm/generate', purpose: 'Generate .strm files for movies/series (background job)' },
    ],
  },
  {
    title: 'Content Delivery (v2 / Xtream)',
    endpoints: [
      { method: 'GET', path: '/api/v2/channels', purpose: 'Live channel listing' },
      { method: 'GET', path: '/api/v2/movies', purpose: 'Movie listing' },
      { method: 'GET', path: '/api/v2/series', purpose: 'Series listing' },
      { method: 'GET', path: '/player_api.php', purpose: 'Xtream Codes API emulation (used by TiviMate etc.)' },
      { method: 'GET', path: '/xmltv.php', purpose: 'XMLTV EPG feed' },
    ],
  },
];

const methodColor: Record<Endpoint['method'], string> = {
  GET: 'bg-blue-900/30 text-blue-400',
  POST: 'bg-green-900/30 text-green-400',
  PUT: 'bg-yellow-900/30 text-yellow-400',
  DELETE: 'bg-red-900/30 text-red-400',
};

const ApiReference: React.FC = () => {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Quick reference for the server's REST endpoints. All routes below (except Auth and Xtream/EPG player paths)
        require a Bearer JWT — admin routes additionally require the admin role.
      </p>
      {GROUPS.map((group) => (
        <div key={group.title} className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-400">{group.title}</h3>
          <div className="space-y-1.5">
            {group.endpoints.map((ep) => (
              <div key={ep.method + ep.path} className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-800/40">
                <span className={`w-14 flex-shrink-0 rounded px-2 py-0.5 text-center text-[10px] font-black ${methodColor[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="flex-shrink-0 font-mono text-xs text-gray-200">{ep.path}</code>
                <span className="text-xs text-gray-500">{ep.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApiReference;
