import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl', 'E'], description: 'Go to Orders' },
      { keys: ['Ctrl', 'Q'], description: 'Go to Quotes' },
      { keys: ['Ctrl', 'U'], description: 'Go to Customers' },
      { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Create new (context-aware)' },
      { keys: ['Ctrl', 'Shift', 'E'], description: 'Export current view' },
      { keys: ['Ctrl', 'F'], description: 'Focus search' },
      { keys: ['Ctrl', '/'], description: 'Show shortcuts' },
    ],
  },
  {
    category: 'General',
    items: [
      { keys: ['Esc'], description: 'Close dialogs/modals' },
      { keys: ['Tab'], description: 'Navigate between fields' },
      { keys: ['Shift', 'Tab'], description: 'Navigate backwards' },
    ],
  },
];

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Kbd>{key}</Kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
