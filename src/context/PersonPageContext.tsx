import React from 'react';

/**
 * Opens a person's page (cast or crew) from anywhere below TVPortal, so the detail
 * header does not need the callback threaded through every browse component.
 * Null outside TVPortal: people are then shown, not clickable.
 */
export const PersonPageContext = React.createContext<((id: number) => void) | null>(null);

export const useOpenPerson = () => React.useContext(PersonPageContext);
