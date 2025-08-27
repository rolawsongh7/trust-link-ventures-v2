import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  Package,
  Users,
  FileText,
  BarChart3,
  Home,
  Settings,
  Building2,
  TrendingUp,
  Contact,
  Globe,
  Plus,
  Edit,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'page' | 'product' | 'customer' | 'quote' | 'action';
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Static navigation results
  const navigationResults: SearchResult[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Go to dashboard',
      type: 'page',
      icon: Home,
      action: () => navigate('/'),
    },
    {
      id: 'nav-products',
      title: 'Products',
      description: 'Browse all products',
      type: 'page',
      icon: Package,
      action: () => navigate('/products'),
    },
    {
      id: 'nav-customers',
      title: 'Customers',
      description: 'Manage customers',
      type: 'page',
      icon: Users,
      action: () => navigate('/customers'),
    },
    {
      id: 'nav-crm',
      title: 'CRM',
      description: 'Customer relationship management',
      type: 'page',
      icon: FileText,
      action: () => navigate('/crm'),
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      description: 'View business analytics',
      type: 'page',
      icon: BarChart3,
      action: () => navigate('/analytics'),
    },
    {
      id: 'nav-partners',
      title: 'Partners',
      description: 'View business partners',
      type: 'page',
      icon: Building2,
      action: () => navigate('/partners'),
    },
    {
      id: 'nav-contact',
      title: 'Contact',
      description: 'Contact information',
      type: 'page',
      icon: Contact,
      action: () => navigate('/contact'),
    },
    {
      id: 'nav-about',
      title: 'About',
      description: 'About us',
      type: 'page',
      icon: Globe,
      action: () => navigate('/about'),
    },
  ];

  // Quick actions
  const actionResults: SearchResult[] = [
    {
      id: 'action-new-quote',
      title: 'Create New Quote',
      description: 'Start a new quote request',
      type: 'action',
      icon: Plus,
      action: () => navigate('/quote-request'),
    },
    {
      id: 'action-view-cart',
      title: 'View Shopping Cart',
      description: 'Check items in cart',
      type: 'action',
      icon: ShoppingCart,
      action: () => {
        // This would open the cart - integrate with your cart system
        console.log('Open cart');
      },
    },
  ];

  const searchDatabase = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Try to search products - handle case where table might not exist
      let products: any[] = [];
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, description')
          .ilike('name', `%${query}%`)
          .limit(5);
        products = data || [];
      } catch (error) {
        console.log('Products table not available yet');
      }

      // Try to search customers - handle case where table might not exist
      let customers: any[] = [];
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, company_name, contact_name')
          .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
          .limit(5);
        customers = data || [];
      } catch (error) {
        console.log('Customers table not available yet');
      }

      // Try to search quote requests - handle case where table might not exist
      let quotes: any[] = [];
      try {
        const { data } = await supabase
          .from('quote_requests')
          .select('id, title, status')
          .ilike('title', `%${query}%`)
          .limit(5);
        quotes = data || [];
      } catch (error) {
        console.log('Quote requests table not available yet');
      }

      const searchResults: SearchResult[] = [];

      // Add product results
      products?.forEach((product) => {
        searchResults.push({
          id: `product-${product.id}`,
          title: product.name,
          description: product.description?.substring(0, 100) + '...' || 'Product',
          type: 'product',
          icon: Package,
          action: () => navigate(`/products#${product.id}`),
        });
      });

      // Add customer results
      customers?.forEach((customer) => {
        searchResults.push({
          id: `customer-${customer.id}`,
          title: customer.company_name,
          description: `Contact: ${customer.contact_name}`,
          type: 'customer',
          icon: Users,
          action: () => navigate(`/customers/${customer.id}`),
        });
      });

      // Add quote results
      quotes?.forEach((quote) => {
        searchResults.push({
          id: `quote-${quote.id}`,
          title: quote.title,
          description: `Status: ${quote.status}`,
          type: 'quote',
          icon: FileText,
          action: () => navigate(`/crm/quotes/${quote.id}`),
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runCommand = (result: SearchResult) => {
    result.action();
    onOpenChange(false);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search products, customers, quotes... (Ctrl+K)"
        onValueChange={searchDatabase}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Searching...' : 'No results found.'}
        </CommandEmpty>
        
        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationResults.map((result) => (
            <CommandItem
              key={result.id}
              value={result.title}
              onSelect={() => runCommand(result)}
            >
              <result.icon className="mr-2 h-4 w-4" />
              <span>{result.title}</span>
              {result.description && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {result.description}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {actionResults.map((result) => (
            <CommandItem
              key={result.id}
              value={result.title}
              onSelect={() => runCommand(result)}
            >
              <result.icon className="mr-2 h-4 w-4" />
              <span>{result.title}</span>
              {result.description && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {result.description}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search Results */}
        {results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Search Results">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => runCommand(result)}
                >
                  <result.icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">
                        {result.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};