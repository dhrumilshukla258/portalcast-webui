import React from 'react';
import { Search, X } from 'lucide-react';

type SearchFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  ref?: React.Ref<HTMLInputElement>;
  /** Shows a clear button while there is text. */
  onClear?: () => void;
};

/** A search input with its icon and clear button (ui.css .ui-field). */
export default function SearchField({ ref, onClear, className = '', value, ...rest }: SearchFieldProps) {
  return (
    <div className={`ui-field ${className}`}>
      <Search className="ui-field-icon" />
      <input ref={ref} type="search" value={value} data-focusable="true" className="ui-field-input" {...rest} />
      {onClear && value ? (
        <button type="button" aria-label="Clear" onClick={onClear} className="ui-field-clear">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
