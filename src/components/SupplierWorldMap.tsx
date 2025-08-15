import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Supplier {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
  flag: string;
}

const suppliers: Supplier[] = [
  {
    id: 'uk-jmarr',
    name: 'J. Marr',
    country: 'United Kingdom',
    coordinates: [-2.0, 54.0],
    flag: '🇬🇧'
  },
  {
    id: 'uk-niah',
    name: 'Niah Foods UK',
    country: 'United Kingdom', 
    coordinates: [-1.5, 53.5],
    flag: '🇬🇧'
  },
  {
    id: 'argentina',
    name: 'JAB Brothers',
    country: 'Argentina',
    coordinates: [-58.3816, -34.6037],
    flag: '🇦🇷'
  },
  {
    id: 'netherlands',
    name: 'NOWACO',
    country: 'Netherlands',
    coordinates: [5.2913, 52.1326],
    flag: '🇳🇱'
  },
  {
    id: 'us',
    name: 'AJC International',
    country: 'United States',
    coordinates: [-95.7129, 37.0902],
    flag: '🇺🇸'
  },
  {
    id: 'france',
    name: 'Seapro SAS',
    country: 'France',
    coordinates: [2.3522, 48.8566],
    flag: '🇫🇷'
  }
];

interface SupplierWorldMapProps {
  onSupplierClick?: (supplier: Supplier) => void;
}

const SupplierWorldMap: React.FC<SupplierWorldMapProps> = ({ onSupplierClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.8,
      projection: 'naturalEarth'
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Add suppliers to map
      suppliers.forEach((supplier) => {
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'supplier-marker';
        markerElement.innerHTML = `
          <div class="flex flex-col items-center cursor-pointer transform hover:scale-110 transition-transform">
            <div class="bg-white rounded-full p-2 shadow-lg border-2 border-primary">
              <span class="text-2xl">${supplier.flag}</span>
            </div>
            <div class="bg-primary text-white px-2 py-1 rounded text-xs font-medium mt-1 whitespace-nowrap">
              ${supplier.name}
            </div>
          </div>
        `;

        markerElement.addEventListener('click', () => {
          setSelectedSupplier(supplier);
          onSupplierClick?.(supplier);
        });

        // Add marker to map
        new mapboxgl.Marker(markerElement)
          .setLngLat(supplier.coordinates)
          .addTo(map.current!);
      });
    });
  };

  useEffect(() => {
    if (mapboxToken) {
      initializeMap();
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  if (showTokenInput) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Interactive World Map</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your Mapbox public token to view the interactive supplier map.
            Get your token at <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter Mapbox public token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              onClick={() => {
                if (mapboxToken.startsWith('pk.')) {
                  setShowTokenInput(false);
                } else {
                  alert('Please enter a valid Mapbox public token (starts with pk.)');
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            >
              Load Map
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Global Supplier Network</h3>
        <p className="text-muted-foreground">Click on any supplier marker to learn more</p>
      </div>
      
      <Card className="overflow-hidden">
        <div ref={mapContainer} className="w-full h-96" />
      </Card>

      {selectedSupplier && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedSupplier.flag}</span>
            <div>
              <h4 className="font-semibold">{selectedSupplier.name}</h4>
              <Badge variant="outline">{selectedSupplier.country}</Badge>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <button
          onClick={() => setShowTokenInput(true)}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Change Mapbox Token
        </button>
      </div>
    </div>
  );
};

export default SupplierWorldMap;