import React from 'react';

type ButtonProps = React.ComponentProps<'button'> & {
  /** primary: solid (the text colour); accent: the theme's main-action fill; danger: red;
   *  secondary: outlined; link: text only. */
  variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'link';
};

/** A button (ui.css .ui-button), reachable with the arrow keys and remote. */
export default function Button({ variant = 'secondary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} data-focusable="true" data-variant={variant} className={`ui-button ${className}`} {...rest} />;
}
