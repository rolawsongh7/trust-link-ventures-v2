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
        // Remove unused code
        dead_code: true,
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
    // Optimize chunk splitting - vendor packages only
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Only split vendor packages, not routes
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
          }
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
