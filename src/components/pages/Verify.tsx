import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import { toast } from 'react-toastify';
import { KeyRound, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function Verify() {
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [userCode, setUserCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If not logged in, redirect to login page with this page as redirect target
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      const redirectUrl = encodeURIComponent(`/verify?code=${userCode}`);
      toast.info('Please sign in first to authorize devices.');
      navigate(`/login?redirect=${redirectUrl}`);
    }
  }, [isLoggedIn, authLoading, navigate, userCode]);

  const handleAuthorize = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userCode.trim()) {
      toast.error('Please enter a valid authorization code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; message?: string }>('/auth/device/authorize', {
        userCode: userCode.trim(),
      });

      if (response.data?.success) {
        setSuccess(true);
        toast.success('Device authorized successfully!');
      } else {
        setError('Failed to authorize device. Please check the code.');
      }
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message || 'Verification failed. The code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  // Automatically submit if code is in query parameter and logged in
  useEffect(() => {
    if (isLoggedIn && codeParam && !success && !loading && !error) {
      handleAuthorize();
    }
  }, [isLoggedIn, codeParam, success, loading, error, handleAuthorize]);

  // This page is reachable both from a logged-out phone scanning a QR (where
  // staying here makes sense — there's nothing else for that session to do)
  // and, via the header's "Authorize a Device" link, from a user already
  // browsing the app. For the latter, stopping dead on this confirmation
  // screen after success reads as a dead end rather than a completed action —
  // return them to the app automatically instead of requiring the manual
  // "Go to Web Portal" click.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate('/', { replace: true }), 1800);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen app-bg flex justify-center items-center font-sans text-fg-soft">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex flex-col justify-center items-center px-4 font-sans text-fg-soft">
      <div className="max-w-md w-full bg-panel border border-line rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex items-center mb-8">
          <img
            src="/portalcast-logo.svg"
            className="w-28 sm:w-32 cursor-pointer"
            alt="PortalCast"
            onClick={() => navigate('/')}
          />
        </div>

        {success ? (
          /* Success Screen */
          <div className="w-full flex flex-col items-center text-center py-6 space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-fg">TV Authorized!</h2>
              <p className="text-fg-muted text-sm max-w-xs">
                Your Smart TV is now logged in as <span className="text-accent font-semibold">{user?.name}</span>.
              </p>
            </div>
            <p className="text-xs text-fg-subtle">
              You can close this tab now. The TV screen will update automatically.
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full mt-4 py-3.5 rounded-xl bg-panel-raised hover:bg-panel-hover text-fg-soft font-bold transition-all duration-300 border border-line"
            >
              Go to Web Portal
            </button>
          </div>
        ) : (
          /* Entry Screen */
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-6">
              <KeyRound className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-center mb-2">Authorize Smart TV</h2>
            <p className="text-fg-muted text-sm text-center mb-6">
              Logged in as <span className="text-accent font-semibold">{user?.email}</span>. Confirm the 6-character code on your TV screen to pair the device.
            </p>

            <form onSubmit={handleAuthorize} className="w-full space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-muted tracking-wide uppercase">
                  TV Authorization Code
                </label>
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="e.g. AB-CDE"
                  maxLength={10}
                  className="w-full bg-page border border-line hover:border-accent/30 focus:border-focus rounded-2xl py-4 text-center text-2xl font-mono font-extrabold tracking-widest text-accent focus:outline-hidden transition-all duration-300"
                />
              </div>

              {error && (
                <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start space-x-3 text-left">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-400 leading-snug">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl ui-brand hover:brightness-110 font-semibold transition-all duration-300 shadow-xl shadow-accent/10 hover:shadow-accent/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authorizing Device...</span>
                  </>
                ) : (
                  <span>Authorize TV Device</span>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
