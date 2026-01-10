import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Search, 
  DollarSign, 
  Package, 
  TrendingUp, 
  AlertCircle,
  Save,
  Download,
  Upload,
  History,
  Check,
  X
} from 'lucide-react';
import { PriceKPISummary } from '@/components/admin/price-management/PriceKPISummary';
import { BulkPriceImport } from '@/components/admin/price-management/BulkPriceImport';
import { PriceHistoryDialog } from '@/components/admin/price-management/PriceHistoryDialog';

interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  supplier: string;
  unit_price: number;
  cost_price: number | null;
  price_currency: string;
  price_unit: string;
  last_price_update: string | null;
  is_active: boolean;
}

interface EditingPrice {
  id: string;
  unit_price: string;
  cost_price: string;
  price_unit: string;
}

const PriceManagement: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, EditingPrice>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_products')
        .select('id, name, category, supplier, unit_price, cost_price, price_currency, price_unit, last_price_update, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
      
      const uniqueCategories = [...new Set((data || []).map(p => p.category).filter(Boolean))];
      const uniqueSuppliers = [...new Set((data || []).map(p => p.supplier).filter(Boolean))];
      setCategories(uniqueCategories);
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.supplier?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || product.supplier === supplierFilter;
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'priced' && product.unit_price > 0) ||
                        (priceFilter === 'unpriced' && (!product.unit_price || product.unit_price === 0));
    return matchesSearch && matchesCategory && matchesSupplier && matchesPrice;
  });

  const startEditing = (product: SupplierProduct) => {
    setEditingPrices(prev => ({
      ...prev,
      [product.id]: {
        id: product.id,
        unit_price: product.unit_price?.toString() || '0',
        cost_price: product.cost_price?.toString() || '',
        price_unit: product.price_unit || 'kg'
      }
    }));
  };

  const cancelEditing = (productId: string) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const savePrice = async (productId: string) => {
    const editing = editingPrices[productId];
    if (!editing) return;

    try {
      setSavingIds(prev => new Set(prev).add(productId));

      const { error } = await supabase
        .from('supplier_products')
        .update({
          unit_price: parseFloat(editing.unit_price) || 0,
          cost_price: editing.cost_price ? parseFloat(editing.cost_price) : null,
          price_unit: editing.price_unit,
          last_price_update: new Date().toISOString(),
          price_updated_by: user?.id
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Price updated successfully');
      cancelEditing(productId);
      fetchProducts();
    } catch (error) {
      console.error('Error saving price:', error);
      toast.error('Failed to save price');
    } finally {
      setSavingIds(prev => {
        const updated = new Set(prev);
        updated.delete(productId);
        return updated;
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'Supplier', 'Category', 'Unit Price', 'Cost Price', 'Currency', 'Price Unit'];
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(p => [
        `"${p.name}"`,
        `"${p.supplier || ''}"`,
        `"${p.category || ''}"`,
        p.unit_price || 0,
        p.cost_price || '',
        p.price_currency || 'USD',
        p.price_unit || 'kg'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-prices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Prices exported to CSV');
  };

  const pricedCount = products.filter(p => p.unit_price && p.unit_price > 0).length;
  const unpricedCount = products.length - pricedCount;
  const avgMargin = products
    .filter(p => p.unit_price && p.cost_price && p.unit_price > 0)
    .reduce((acc, p) => acc + ((p.unit_price - (p.cost_price || 0)) / p.unit_price * 100), 0) / 
    (products.filter(p => p.unit_price && p.cost_price && p.unit_price > 0).length || 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Price Management</h1>
          <p className="text-muted-foreground">Manage product prices for quotes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Prices
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <PriceKPISummary
        totalProducts={products.length}
        pricedProducts={pricedCount}
        unpricedProducts={unpricedCount}
        avgMargin={avgMargin}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(sup => (
                  <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="priced">With Prices</SelectItem>
                <SelectItem value="unpriced">Missing Prices</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Prices ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isEditing = !!editingPrices[product.id];
                    const editing = editingPrices[product.id];
                    const isSaving = savingIds.has(product.id);
                    const margin = product.unit_price && product.cost_price 
                      ? ((product.unit_price - product.cost_price) / product.unit_price * 100).toFixed(1)
                      : null;

                    return (
                      <TableRow key={product.id} className={!product.unit_price || product.unit_price === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          {(!product.unit_price || product.unit_price === 0) && (
                            <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No price set
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.supplier || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.category || 'Uncategorized'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing.cost_price}
                              onChange={(e) => setEditingPrices(prev => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], cost_price: e.target.value }
                              }))}
                              className="w-24 text-right"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              {product.cost_price ? `$${product.cost_price.toFixed(2)}` : '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editing.unit_price}
                              onChange={(e) => setEditingPrices(prev => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], unit_price: e.target.value }
                              }))}
                              className="w-24 text-right"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <span className={product.unit_price && product.unit_price > 0 ? 'font-medium' : 'text-muted-foreground'}>
                              {product.unit_price ? `$${product.unit_price.toFixed(2)}` : '$0.00'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editing.price_unit}
                              onValueChange={(value) => setEditingPrices(prev => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], price_unit: value }
                              }))}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                                <SelectItem value="unit">unit</SelectItem>
                                <SelectItem value="box">box</SelectItem>
                                <SelectItem value="case">case</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground">{product.price_unit || 'kg'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {margin ? (
                            <Badge variant={parseFloat(margin) > 20 ? 'default' : 'secondary'} className="font-mono">
                              {margin}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => savePrice(product.id)}
                                  disabled={isSaving}
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => cancelEditing(product.id)}
                                  disabled={isSaving}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => startEditing(product)}
                                  className="h-8 w-8"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setHistoryProductId(product.id)}
                                  className="h-8 w-8"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BulkPriceImport
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchProducts}
      />

      <PriceHistoryDialog
        productId={historyProductId}
        productName={products.find(p => p.id === historyProductId)?.name || ''}
        open={!!historyProductId}
        onOpenChange={(open) => !open && setHistoryProductId(null)}
      />
    </div>
  );
};

export default PriceManagement;
