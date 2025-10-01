import { getStorageUrl } from '@/config/supabase';

export interface Supplier {
  id: string;
  name: string;
  logo: string;
  address: string[];
}

export const suppliers: Supplier[] = [
  {
    id: 'jmarr',
    name: 'J Marr',
    logo: getStorageUrl('supplier-logos', 'J_marr.png'),
    address: [
      'J Marr (Assisted Sales) Ltd',
      '123 Industrial Estate',
      'Aberdeen, Scotland',
      'United Kingdom'
    ]
  },
  {
    id: 'niah-foods',
    name: 'Niah Foods',
    logo: getStorageUrl('supplier-logos', 'niah_foods.png'),
    address: [
      'Niah Foods Limited',
      '456 Business Park',
      'Accra, Ghana'
    ]
  },
  {
    id: 'nowaco',
    name: 'Nowaco',
    logo: getStorageUrl('supplier-logos', 'nowaco.png'),
    address: [
      'Nowaco Trading Company',
      '789 Commerce Street',
      'Rotterdam, Netherlands'
    ]
  },
  {
    id: 'jab-brothers',
    name: 'JAB Brothers',
    logo: getStorageUrl('supplier-logos', 'Jab_bros.png'),
    address: [
      'JAB Brothers International',
      '321 Trading Avenue',
      'Buenos Aires, Argentina'
    ]
  },
  {
    id: 'seapro',
    name: 'Seapro',
    logo: getStorageUrl('supplier-logos', 'seapro.png'),
    address: [
      'Seapro Seafood Solutions',
      '654 Marine Drive',
      'Singapore'
    ]
  },
  {
    id: 'ajc',
    name: 'AJC International',
    logo: getStorageUrl('supplier-logos', 'ajc-logo.png'),
    address: [
      'AJC International Inc.',
      '987 Global Plaza',
      'Hong Kong'
    ]
  }
];
