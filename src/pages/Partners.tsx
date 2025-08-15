import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Globe, Users, Truck, Shield } from 'lucide-react';
import SupplierWorldMap from '@/components/SupplierWorldMap';
import portFleetAerial from '@/assets/port-fleet-aerial.jpg';

const Partners = () => {
  const [hoveredSupplier, setHoveredSupplier] = useState<string | null>(null);

  const mapSuppliers = [
    {
      id: 'uk-jmarr',
      name: 'J. Marr',
      country: 'United Kingdom',
      position: { top: '28%', left: '49%' },
    },
    {
      id: 'uk-niah',
      name: 'Niah Foods UK',
      country: 'United Kingdom',
      position: { top: '26%', left: '50.5%' },
    },
    {
      id: 'argentina',
      name: 'JAB Brothers',
      country: 'Argentina', 
      position: { top: '75%', left: '29%' },
    },
    {
      id: 'netherlands',
      name: 'NOWACO',
      country: 'Netherlands',
      position: { top: '25%', left: '52%' },
    },
    {
      id: 'us',
      name: 'AJC International',
      country: 'United States',
      position: { top: '35%', left: '20%' },
    },
    {
      id: 'france', 
      name: 'Seapro SAS',
      country: 'France',
      position: { top: '32%', left: '51%' },
    }
  ];

  const strategicPartner = {
    name: "New Gen Link",
    location: "California, USA",
    website: "https://nglglobalmarkets.com",
    description: "New Gen Link (NGL) is our strategic partner and your trusted global gateway to premium frozen products. Specializing in premium-quality seafood and meat delivered fresh from Europe and America to West Africa, NGL ensures seamless supply chain management with ISO 22000 certification and complete cold chain excellence.",
    services: [
      "Global sourcing at competitive market prices",
      "Professional packaging and shipping",
      "Cold chain integrity throughout transit",
      "Certified cold storage facilities in Ghana",
      "Real-time tracking and quality guarantees",
      "Streamlined ordering platform"
    ],
    stats: [
      { label: "Global Partners", value: "50+" },
      { label: "Tons Exported", value: "10,000+" },
      { label: "Inspection Rate", value: "100%" },
      { label: "Avg Processing", value: "24hrs" }
    ]
  };

  const getCountryFlag = (location: string) => {
    const flagMap: { [key: string]: string } = {
      'United Kingdom': '🇬🇧',
      'Argentina': '🇦🇷',
      'Netherlands': '🇳🇱',
      'United States': '🇺🇸',
      'France': '🇫🇷'
    };
    return flagMap[location] || '🌍';
  };

  const globalPartners = [
    {
      name: "Niah Foods UK",
      location: "United Kingdom",
      description: "Premium UK-based food supplier specializing in high-quality frozen products for international markets. Known for exceptional quality standards and reliable supply chain management.",
      specialties: ["Premium Frozen Foods", "Quality Assurance", "UK Market Expertise"],
      established: "2010+"
    },
    {
      name: "JAB Brothers",
      location: "Argentina",
      website: "https://www.jab-bros.com.ar/home",
      description: "Family-owned business with over 15 years of experience in production and exportation of frozen foods. Based in the Rio de la Plata region, specializing in premium seafood and beef products.",
      specialties: ["Seafood", "Beef Products", "South American Markets"],
      established: "2008"
    },
    {
      name: "NOWACO",
      location: "Netherlands",
      website: "https://nowaco.com",
      description: "Professional food merchant dedicated to providing and selling frozen food on a global scale. With over 50 years of passion in the food trading business.",
      specialties: ["Frozen Meats", "Fish & Seafood", "Vegetables", "Global Trading"],
      established: "1970+"
    },
    {
      name: "AJC International",
      location: "United States",
      website: "https://www.ajcfood.com",
      description: "Leading global frozen food marketer serving more than 140 countries across six continents. Expertise in poultry, pork, meat, vegetables, fruits, and seafood with 400+ branded products.",
      specialties: ["Poultry", "Pork", "Meat", "Vegetables & Fruits", "Seafood"],
      established: "1960+",
      reach: "140+ Countries"
    },
    {
      name: "J. Marr",
      location: "United Kingdom",
      website: "https://marsea.co.uk",
      description: "Established UK supplier specializing in premium seafood and meat products. Known for quality Atlantic and global seafood sourcing, as well as premium beef, chicken, and pork products.",
      specialties: ["Atlantic Seafood", "Premium Meat", "Poultry Products"],
      established: "1990+"
    },
    {
      name: "Seapro SAS",
      location: "France",
      website: "https://seaprosas.com/en/",
      description: "Founded in 2006 by food sector experts, Seapro SAS focuses on retail and HORECA format products. Committed to putting customers at the center of priorities with humane and close treatment.",
      specialties: ["Seafood", "Meat & Poultry", "Asian Specialties", "Processed Foods"],
      established: "2006"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Our Global <span className="text-primary">Partners</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Building strong partnerships across continents to deliver premium frozen products 
            with excellence, reliability, and innovation at every step of the supply chain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="flex items-center justify-center space-x-3">
              <Globe className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold">6 Continents</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold">Trusted Network</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-lg font-semibold">Quality Assured</span>
            </div>
          </div>
        </section>

        {/* Strategic Partner Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Strategic Partner
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Partnering with industry leaders to ensure seamless global distribution and premium quality delivery.
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl text-primary">{strategicPartner.name}</CardTitle>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{strategicPartner.location}</span>
                </Badge>
              </div>
              <CardDescription className="text-base">
                {strategicPartner.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Key Services</h4>
                <ul className="space-y-2">
                  {strategicPartner.services.map((service, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {strategicPartner.stats.map((stat, index) => (
                  <div key={index} className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <Button asChild className="w-full">
                <a href={strategicPartner.website} target="_blank" rel="noopener noreferrer">
                  Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Global Partners Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Trusted Suppliers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              A carefully curated network of premium suppliers from around the world, 
              ensuring consistent quality and reliable supply chains.
            </p>
          </div>

          {/* Interactive World Map */}
          <div className="mb-16">
            <SupplierWorldMap />
          </div>

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {globalPartners.map((partner, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{getCountryFlag(partner.location)}</span>
                      {partner.name}
                    </CardTitle>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <span className="text-xs">{partner.location}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {partner.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {partner.specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Established: {partner.established}</span>
                    {partner.reach && (
                      <span className="text-primary font-medium">{partner.reach}</span>
                    )}
                  </div>
                  
                  
                  {partner.website && (
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={partner.website} target="_blank" rel="noopener noreferrer">
                        Visit Website <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Supply Chain Excellence */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Supply Chain Excellence
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our global partner network ensures seamless logistics, quality control, 
                and timely delivery across international markets.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Global Logistics Network</h3>
                    <p className="text-sm text-muted-foreground">
                      Efficient transportation and distribution systems spanning multiple continents.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Quality Assurance</h3>
                    <p className="text-sm text-muted-foreground">
                      Rigorous quality control standards maintained across all partner facilities.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Market Expertise</h3>
                    <p className="text-sm text-muted-foreground">
                      Deep understanding of local markets and regulatory requirements worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={portFleetAerial} 
                alt="Aerial view of cargo ships docking at commercial port"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">Global Supply Chain</h3>
                  <p className="text-white/90">
                    Strategic port operations ensuring seamless global distribution
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Partners;