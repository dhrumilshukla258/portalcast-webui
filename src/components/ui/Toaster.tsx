import { Bounce, Slide, ToastContainer } from 'react-toastify';
import { useTheme } from '@/themes/theme';

/**
 * Where notifications appear (`toast.success(...)` and the rest, from anywhere). The card's look
 * is the theme's (ui.css .ui-toast, --ui-toast-* tokens); so is the way it comes in
 * (--ui-toast-motion: bounce or slide), read again whenever the theme changes.
 */
export default function Toaster() {
  useTheme();
  const motion = getComputedStyle(document.documentElement).getPropertyValue('--ui-toast-motion').trim();
  return (
    <ToastContainer
      className="ui-toaster"
      position="bottom-right"
      autoClose={4000}
      newestOnTop={false}
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      transition={motion === 'slide' ? Slide : Bounce}
      toastClassName={(context) => `ui-toast ui-toast--${context?.type ?? 'default'}`}
      bodyClassName={() => 'ui-toast-body'}
    />
  );
}
