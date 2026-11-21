import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Play, Shield, Tv, Sparkles, ChevronRight, Bug, Rocket, Smartphone, MonitorPlay, Tv2 } from 'lucide-react';
import { isTvApp } from '@/utils/helpers';

// Where PortalCast runs: the README's "Where it runs", kept in step with it.
const PLATFORMS = [
  {
    icon: Smartphone,
    title: 'Phones, tablets and computers',
    text: "Open your server's address in the browser and add it to your home screen. Browsers from 2018 on: Chrome 68, Safari on iOS 12, Firefox 78, Edge 79.",
    link: null,
  },
  {
    icon: Tv,
    title: 'LG TVs',
    text: "webOS 5 and newer (2020 on). A small app that opens your server in TV mode, installed with LG's Developer Mode app.",
    link: { label: 'Get the LG app', href: 'https://github.com/dhrumilshukla258/portalcast-webui/releases/latest' },
  },
  {
    icon: MonitorPlay,
    title: 'Samsung TVs',
    text: "Open your server's address in the TV's browser, or install the Tizen app signed with your own Samsung certificate.",
    link: { label: 'Setup steps', href: 'https://github.com/dhrumilshukla258/portalcast-webui/tree/main/platforms' },
  },
  {
    icon: Tv2,
    title: 'Android TV',
    text: 'Its own app, made for the remote, with the same design.',
    link: { label: 'Android TV app', href: 'https://github.com/dhrumilshukla258/portalcast-tv-android' },
  },
] as const;

export default function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isTvApp()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLaunch = () => {
    if (isLoggedIn) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen app-bg text-fg flex flex-col justify-between selection:bg-action selection:text-on-action">
      {/* Top Navbar */}
      <header className="px-6 py-5 border-b border-divider/40 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/portalcast-logo.svg"
            className="w-24 sm:w-28 md:w-36 cursor-pointer"
            alt="PortalCast"
            onClick={() => navigate('/')}
          />
        </div>
        
        <div>
          {isLoggedIn ? (
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl ui-brand hover:brightness-110 font-medium text-sm transition-all duration-300 shadow-md shadow-accent/10 hover:shadow-accent/20 hover:scale-[1.02] flex items-center space-x-2"
            >
              <span>TV Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl bg-panel-raised hover:bg-panel-hover/80 text-fg-soft font-medium text-sm transition-all duration-300 border border-divider/50 hover:scale-[1.02]"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="grow flex items-center py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-12 gap-12 items-center w-full">
          <div className="md:col-span-7 space-y-8 text-left">
            <div data-ui="tint" className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen IPTV Client</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              A Premium Hub for{' '}
              <span className="ui-brand-text">
                Portalcast Streams
              </span>
            </h1>

            <p className="text-fg-muted text-lg leading-relaxed max-w-xl">
              Connect your Stalker middleware or Xtream codes provider and enjoy seamless live television, high-definition movies, and serials in a responsive, gorgeous, and dynamic interface optimized for both Web and Smart TVs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleLaunch}
                className="px-8 py-4 rounded-2xl ui-brand hover:brightness-110 font-semibold text-base transition-all duration-300 shadow-xl shadow-accent/20 hover:shadow-accent/30 hover:scale-[1.03] flex items-center justify-center space-x-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{isLoggedIn ? 'Launch TV Portal' : 'Start Watching Now'}</span>
              </button>
              
              {!isLoggedIn && (
                <button
                  onClick={() => navigate('/verify')}
                  className="px-8 py-4 rounded-2xl bg-panel/60 hover:bg-panel-hover/80 text-fg-soft font-semibold text-base transition-all duration-300 border border-line hover:scale-[1.02] flex items-center justify-center space-x-2 cursor-pointer"
                  title="For entering a pairing code shown on a TV — not for logging this device in via a code"
                >
                  <span>Have a TV Pairing Code?</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-5 relative hidden md:block">
            <div className="absolute -inset-1 rounded-3xl ui-brand opacity-20 blur-2xl"></div>
            <div className="relative border border-line bg-panel/60 backdrop-blur-md rounded-3xl p-6 shadow-2xl overflow-hidden aspect-4/3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex space-x-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500/80"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="w-16 h-3 rounded-full bg-panel-raised"></div>
              </div>

              <div className="grow flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div data-ui="tint" className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
                    <Tv className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-semibold tracking-wide text-fg-soft">Smart TV Ready</div>
                  <div className="text-xs text-fg-subtle max-w-[200px]">Optimized keyboard and remote controller navigation.</div>
                </div>
              </div>

              <div className="border-t border-line pt-4 flex justify-between items-center text-xs text-fg-subtle">
                <span>Cloud Sync Enabled</span>
                <span>Active Profile</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features List */}
      <section className="bg-page/40 border-t border-divider/80 py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="bg-panel/40 border border-line rounded-2xl p-6 text-left space-y-4">
            <div data-ui="tint" className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Cloud Synchronization</h3>
            <p className="text-fg-muted text-sm leading-relaxed">
              Your favorites list, channel recents, and watch progress are synced on the fly to your personal user account.
            </p>
          </div>

          <div className="bg-panel/40 border border-line rounded-2xl p-6 text-left space-y-4">
            <div data-ui="tint" className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">QR Device Authorization</h3>
            <p className="text-fg-muted text-sm leading-relaxed">
              No tedious passwords typing on TV screens. Simply scan the generated QR code with your mobile device and log in instantly.
            </p>
          </div>

          <div className="bg-panel/40 border border-line rounded-2xl p-6 text-left space-y-4">
            <div data-ui="tint" className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Unified Media Center</h3>
            <p className="text-fg-muted text-sm leading-relaxed">
              Consolidate your Stalker middleware and Xtream Codes TV streams and VOD libraries in one single, high-performance platform.
            </p>
          </div>
        </div>
      </section>

      {/* Where it runs (README, "Where it runs") */}
      <section className="border-t border-divider/80 py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-left space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Watch anywhere</h2>
            <p className="text-fg-muted text-sm leading-relaxed max-w-2xl">
              One app on your phone, your computer and your TV, with your progress, favourites and lists on every one.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((p) => (
              <div key={p.title} className="bg-panel/40 border border-line rounded-2xl p-6 text-left flex flex-col gap-3">
                <div data-ui="tint" className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="text-fg-muted text-sm leading-relaxed flex-1">{p.text}</p>
                {p.link && (
                  <a
                    href={p.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent"
                  >
                    {p.link.label}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tracker: Known Bugs & Upcoming Features */}
      <section className="bg-page/80 border-t border-line py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          
          {/* Known Bugs Column */}
          <div className="space-y-6 text-left">
            <div className="flex items-center space-x-3 border-b border-line pb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Bug className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-wide">Known System Bugs</h2>
            </div>
            
            <div className="space-y-3.5">
              <p className="text-sm text-fg-muted leading-normal italic">
                No known issues at this time. Recently resolved: Continue Watching cache staleness, incomplete history reset, cross-device category desync, Google sign-in messaging for pending accounts, and autoplay from Continue Watching.
              </p>
            </div>
          </div>

          {/* Upcoming Features Column */}
          <div className="space-y-6 text-left">
            <div className="flex items-center space-x-3 border-b border-line pb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Rocket className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-wide">Upcoming Features</h2>
            </div>

            <div className="space-y-4">

              <div className="relative pl-6 border-l-2 border-accent/30 space-y-1">
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-accent"></div>
                <h4 className="text-sm font-semibold text-fg-soft">User Feature Request Pipeline</h4>
                <p className="text-xs text-fg-muted leading-relaxed">Direct community implementation board allowing viewers to submit and upvote client modifications.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-accent/30 space-y-1">
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-accent"></div>
                <h4 className="text-sm font-semibold text-fg-soft">Centralized Bug Report Collection</h4>
                <p className="text-xs text-fg-muted leading-relaxed">Automated exception logging to capture interface issues and improve application stability.</p>
              </div>

              <div className="relative pl-6 border-l-2 border-accent/30 space-y-1">
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-accent"></div>
                <h4 className="text-sm font-semibold text-fg-soft">Push Notification Engine</h4>
                <p className="text-xs text-fg-muted leading-relaxed">Real-time inside-app banners and notifications regarding admin approvals, maintenance logs, or fresh updates.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-line text-center text-xs text-fg-subtle bg-page">
        <p>&copy; {new Date().getFullYear()} Portalcast. All Rights Reserved.</p>
      </footer>
    </div>
  );
}