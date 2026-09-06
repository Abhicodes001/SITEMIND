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
        
        const ctrlRequired = mapping.ctrlKey === true;
        const metaRequired = mapping.metaKey === true;
        const altRequired = mapping.altKey === true;
        const shiftRequired = mapping.shiftKey === true;

        const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
        const matchesCtrlOrMeta = (ctrlRequired || metaRequired)
          ? hasCtrlOrMeta
          : !hasCtrlOrMeta;

        const matchesAlt = event.altKey === altRequired;
        const matchesShift = event.shiftKey === shiftRequired;
        
        if (matchesKey && matchesCtrlOrMeta && matchesAlt && matchesShift) {
          const target = event.target as HTMLElement;
          const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          
          if (isInputFocused && !ctrlRequired && !metaRequired) {
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
