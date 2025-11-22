import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        // Remove console.log in production
        drop_console: true,
        drop_debugger: true,
        // Remove unused code
        dead_code: true,
        // Additional production optimizations
        passes: 3,
      },
      mangle: {
        // iOS Safari compatibility
        safari10: true,
      },
      format: {
        // Remove comments
        comments: false,
      },
    } : undefined,
    // Production security
    sourcemap: mode === 'production' ? false : true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
    // Faster builds in development
    reportCompressedSize: mode === 'production',
  },
  // Environment variable handling
  define: {
    'import.meta.env.VITE_ENABLE_DEBUG': JSON.stringify(mode === 'development'),
    'import.meta.env.VITE_ENABLE_CONSOLE_LOGS': JSON.stringify(mode === 'development'),
  },
}));
