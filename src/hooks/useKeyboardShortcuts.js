import { useEffect } from 'react';

/**
 * Global keyboard shortcuts handler
 * Handles tool switching, actions, and panel toggles
 */
export const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      const isInputField = 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable;
      
      if (isInputField) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // Tool switching (single keys, no modifiers)
      if (!cmdOrCtrl && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            handlers.onHandTool?.();
            break;
          case 'v':
            e.preventDefault();
            handlers.onHandTool?.(); // V is alternative for hand tool
            break;
          case 'r':
            e.preventDefault();
            handlers.onRectangleTool?.();
            break;
          case 'c':
            e.preventDefault();
            handlers.onCircleTool?.();
            break;
          case 'l':
            e.preventDefault();
            handlers.onLineTool?.();
            break;
          case 'p':
            e.preventDefault();
            handlers.onPenTool?.();
            break;
          case 't':
            e.preventDefault();
            handlers.onTextTool?.();
            break;
          case 'delete':
          case 'backspace':
            e.preventDefault();
            handlers.onDelete?.();
            break;
          case 'escape':
            e.preventDefault();
            handlers.onEscape?.();
            break;
          default:
            break;
        }
      }
      
      // Cmd/Ctrl shortcuts
      if (cmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            handlers.onDuplicate?.();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handlers.onRedo?.();
            } else {
              handlers.onUndo?.();
            }
            break;
          case 'a':
            e.preventDefault();
            handlers.onSelectAll?.();
            break;
          case '0':
            e.preventDefault();
            handlers.onZoomReset?.();
            break;
          case '1':
            e.preventDefault();
            handlers.onZoomFit?.();
            break;
          case '2':
            e.preventDefault();
            handlers.onZoomSelection?.();
            break;
          case '-':
          case '_':
            e.preventDefault();
            handlers.onZoomOut?.();
            break;
          case '=':
          case '+':
            e.preventDefault();
            handlers.onZoomIn?.();
            break;
          case '.':
            e.preventDefault();
            handlers.onToggleProperties?.();
            break;
          case '\\':
            e.preventDefault();
            handlers.onToggleLayers?.();
            break;
          case 'k':
            e.preventDefault();
            handlers.onCommandPalette?.();
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
};

export default useKeyboardShortcuts;

