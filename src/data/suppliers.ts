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
    logo: '/src/assets/partners/j-marr-logo.png',
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
    logo: '/src/assets/partners/niah-foods-logo.png',
    address: [
      'Niah Foods Limited',
      '456 Business Park',
      'Accra, Ghana'
    ]
  },
  {
    id: 'nowaco',
    name: 'Nowaco',
    logo: '/src/assets/partners/nowaco-logo.png',
    address: [
      'Nowaco Trading Company',
      '789 Commerce Street',
      'Rotterdam, Netherlands'
    ]
  },
  {
    id: 'jab-brothers',
    name: 'JAB Brothers',
    logo: '/src/assets/partners/jab-brothers-logo.png',
    address: [
      'JAB Brothers International',
      '321 Trading Avenue',
      'Buenos Aires, Argentina'
    ]
  },
  {
    id: 'seapro',
    name: 'Seapro',
    logo: '/src/assets/partners/seapro-logo.png',
    address: [
      'Seapro Seafood Solutions',
      '654 Marine Drive',
      'Singapore'
    ]
  },
  {
    id: 'ajc',
    name: 'AJC International',
    logo: '/src/assets/partners/ajc-logo.png',
    address: [
      'AJC International Inc.',
      '987 Global Plaza',
      'Hong Kong'
    ]
  }
];
