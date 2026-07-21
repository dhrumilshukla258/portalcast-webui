import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import { getPasswordChecks, PASSWORD_REGEX } from '@/utils/passwordChecks';

interface UseLoginFormArgs {
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  navigate: (path: string) => void;
  redirectPath: string;
  setActiveTab: (tab: 'web' | 'tv' | 'forgot' | 'reset') => void;
  resetToken: string | null;
}

// Owns the credentials login/signup/forgot-password/reset-password flows —
// four distinct network calls that all share the same form state
// (email/password/error/success) and the same "clear error+success on any
// input change" behavior, which is why they're one hook rather than four.
export function useLoginForm({
  loginWithCredentials,
  navigate,
  redirectPath,
  setActiveTab,
  resetToken,
}: UseLoginFormArgs) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setCredsError(null);
    setSignupSuccess(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setSignupSuccess(null);

    if (isSignUp) {
      if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
        toast.error('Full Name, email and password are required');
        return;
      }
      if (!PASSWORD_REGEX.test(passwordInput)) {
        toast.error('Password is not matching its criteria');
        return;
      }
      setCredsLoading(true);
      try {
        const response = await api.post<{ success: boolean; message: string }>('/auth/signup', {
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
        });
        toast.success(response.data.message || 'Signup successful!');
        setSignupSuccess(response.data.message || 'Signup successful! Please wait for administrator approval.');
        setNameInput('');
        setPasswordInput('');
      } catch (err) {
        const error = err as Error;
        let message = error.message;
        if (message.includes('Request failed:')) {
          message = 'Signup failed. Email might already be registered or inputs are invalid.';
        }
        setCredsError(message || 'Signup failed');
      } finally {
        setCredsLoading(false);
      }
    } else {
      if (!emailInput.trim() || !passwordInput) {
        toast.error('Email and password are required');
        return;
      }
      setCredsLoading(true);
      try {
        await loginWithCredentials(emailInput.trim(), passwordInput);
        toast.success('Successfully logged in!');
        navigate(redirectPath);
      } catch (err) {
        const error = err as Error;
        let message = error.message;
        if (message.includes('403')) {
          message = 'Your account is pending administrator approval.';
        } else if (message.includes('401')) {
          message = 'Invalid email or password.';
        } else if (message.includes('400')) {
          message = 'Please login using Google Sign-In or contact support.';
        }
        setCredsError(message || 'Invalid email or password');
      } finally {
        setCredsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setCredsError(null);
    setSignupSuccess(null);
    setNameInput('');
    setPasswordInput('');
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setSignupSuccess(null);
    if (!emailInput.trim()) {
      toast.error('Email is required');
      return;
    }
    setCredsLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/forgot-password', {
        email: emailInput.trim(),
      });
      toast.success(res.data.message || 'Reset email sent successfully!');
      setSignupSuccess(res.data.message || 'If an account exists, a reset link has been sent to your email.');
      setEmailInput('');
    } catch (err) {
      const error = err as Error;
      setCredsError(error.message || 'Failed to request password reset link.');
    } finally {
      setCredsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setSignupSuccess(null);

    if (!resetToken) {
      toast.error('Reset token is missing from URL.');
      return;
    }

    if (!PASSWORD_REGEX.test(passwordInput)) {
      toast.error('Password is not matching its criteria');
      return;
    }

    setCredsLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/auth/reset-password', {
        token: resetToken,
        password: passwordInput,
      });
      toast.success(res.data.message || 'Password reset successfully!');
      toast.info('You can now log in with your new password.');
      setPasswordInput('');
      setActiveTab('web');
    } catch (err) {
      const error = err as Error;
      setCredsError(error.message || 'Failed to reset password.');
    } finally {
      setCredsLoading(false);
    }
  };

  const passChecks = getPasswordChecks(passwordInput);

  return {
    isSignUp,
    nameInput,
    setNameInput,
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    credsLoading,
    credsError,
    signupSuccess,
    clearMessages,
    handleCredentialsSubmit,
    toggleMode,
    handleForgotPasswordSubmit,
    handleResetPasswordSubmit,
    passChecks,
  };
}
