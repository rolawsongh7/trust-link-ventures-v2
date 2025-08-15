import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Supplier {
  id: string;
  name: string;
  country: string;
  position: { top: string; left: string };
  flag: string;
}

const suppliers: Supplier[] = [
  {
    id: 'uk-jmarr',
    name: 'J. Marr',
    country: 'United Kingdom',
    position: { top: '28%', left: '49%' },
    flag: '🇬🇧'
  },
  {
    id: 'uk-niah',
    name: 'Niah Foods UK',
    country: 'United Kingdom', 
    position: { top: '26%', left: '50.5%' },
    flag: '🇬🇧'
  },
  {
    id: 'argentina',
    name: 'JAB Brothers',
    country: 'Argentina',
    position: { top: '75%', left: '29%' },
    flag: '🇦🇷'
  },
  {
    id: 'netherlands',
    name: 'NOWACO',
    country: 'Netherlands',
    position: { top: '25%', left: '52%' },
    flag: '🇳🇱'
  },
  {
    id: 'us',
    name: 'AJC International',
    country: 'United States',
    position: { top: '35%', left: '20%' },
    flag: '🇺🇸'
  },
  {
    id: 'france',
    name: 'Seapro SAS',
    country: 'France',
    position: { top: '32%', left: '51%' },
    flag: '🇫🇷'
  }
];

const SimpleWorldMap: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Global Supplier Network</h3>
        <p className="text-muted-foreground">Our trusted partners around the world</p>
      </div>
      
      <Card className="overflow-hidden">
        <div className="relative w-full h-96 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          {/* Simple world map background */}
          <svg 
            viewBox="0 0 1000 500" 
            className="absolute inset-0 w-full h-full opacity-30"
            fill="currentColor"
          >
            {/* Simplified world map paths */}
            <path d="M158 206c2-5 12-10 25-8 15 2 25-3 35-8 8-4 18-2 25 2 12 7 20 18 35 22 18 5 38-2 55 8 10 6 15 18 28 22 15 5 32-5 48-2 20 4 35 20 58 18 25-2 45-25 72-22 30 3 55 30 88 28 35-2 65-35 102-30 40 5 75 45 120 42 48-3 90-50 142-45 55 5 105 55 165 52 62-3 118-58 185-52 70 6 133 65 210 60 80-5 152-70 240-62 92 8 175 80 275 75 104-5 198-85 310-78 116 8 222 95 345 88 128-7 244-102 380-92 142 10 271 112 420 102 155-10 296-122 460-110 170 12 325 134 505 122 187-12 357-144 555-130 206 14 393 158 610 145 225-13 430-171 665-155 244 16 466 187 720 172 264-15 504-202 780-185 287 17 548 219 850 202V350H0V206z"/>
          </svg>
          
          {/* Supplier markers */}
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
              style={{ 
                top: supplier.position.top, 
                left: supplier.position.left 
              }}
              onClick={() => setSelectedSupplier(selectedSupplier?.id === supplier.id ? null : supplier)}
            >
              <div className="bg-white rounded-full p-2 shadow-lg border-2 border-primary hover:border-primary/80">
                <span className="text-lg">{supplier.flag}</span>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-primary text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                {supplier.name}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedSupplier && (
        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedSupplier.flag}</span>
            <div>
              <h4 className="font-semibold text-lg">{selectedSupplier.name}</h4>
              <Badge variant="outline">{selectedSupplier.country}</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SimpleWorldMap;