import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ThemeSelectorProps {
  value: string;
  onChange: (theme: string) => void;
}

export const ThemeSelector = ({ value, onChange }: ThemeSelectorProps) => {
  const themes = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Match your device' },
  ];

  return (
    <div className="space-y-3">
      <Label>Theme</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = value === theme.value;

          return (
            <motion.button
              key={theme.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(theme.value)}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 bg-card'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check className="h-5 w-5 text-primary" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-1">
                <p className={`font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                  {theme.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {theme.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};