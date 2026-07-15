import { useEffect } from 'react';

interface ShortcutMapping {
  key: string; // e.g. 'k', 'Enter', '/'
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: (e: KeyboardEvent) => void;
}

export const useShortcuts = (shortcuts: ShortcutMapping[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const mapping of shortcuts) {
        const matchesKey = event.key.toLowerCase() === mapping.key.toLowerCase();
        const matchesCtrl = mapping.ctrlKey === undefined || event.ctrlKey === mapping.ctrlKey;
        const matchesMeta = mapping.metaKey === undefined || event.metaKey === mapping.metaKey;
        const matchesAlt = mapping.altKey === undefined || event.altKey === mapping.altKey;
        const matchesShift = mapping.shiftKey === undefined || event.shiftKey === mapping.shiftKey;
        
        if (matchesKey && (matchesCtrl || matchesMeta) && matchesAlt && matchesShift) {
          // If focused on an input element, only trigger if it's not a standard input intercept (like typing a letter)
          const target = event.target as HTMLElement;
          const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          
          // Allow Ctrl+Enter or Ctrl+K even if focused, but skip single letter shortcuts like '/' if focused
          if (isInputFocused && !mapping.ctrlKey && !mapping.metaKey) {
            continue;
          }
          
          event.preventDefault();
          mapping.action(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};
export default useShortcuts;
