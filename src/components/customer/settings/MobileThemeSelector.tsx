import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useEffect, useState } from "react";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Clean and bright",
    icon: Sun,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    value: "system",
    label: "System",
    description: "Match your device",
    icon: Monitor,
    gradient: "from-slate-500 to-slate-600",
  },
];

export function MobileThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="h-20 rounded-2xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = theme === option.value;

        return (
          <motion.button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              relative w-full flex items-center gap-4 p-4 rounded-2xl
              bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
              border-2 transition-all duration-300
              ${isSelected 
                ? "border-primary shadow-[0_4px_20px_rgba(0,0,0,0.12)]" 
                : "border-white/30 dark:border-slate-800/30 hover:border-primary/50"
              }
            `}
            whileTap={{ scale: 0.98 }}
          >
            {/* Icon Container */}
            <div
              className={`
                h-12 w-12 rounded-full flex items-center justify-center
                bg-gradient-to-br ${option.gradient}
                shadow-lg transition-transform duration-300
                ${isSelected ? "scale-110" : ""}
              `}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 text-left">
              <div className="font-semibold text-foreground">{option.label}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>

            {/* Checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="h-4 w-4 text-primary-foreground" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
