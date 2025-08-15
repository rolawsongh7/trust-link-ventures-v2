import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Globe, Users, Truck, Shield } from 'lucide-react';
import PartnerGrid from '@/components/partners/PartnerGrid';
import portFleetAerial from '@/assets/port-fleet-aerial.jpg';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Helmet } from 'react-helmet-async';

// Partner logos
import niahFoodsLogo from '@/assets/partners/niah-foods-logo.png';
import jabBrothersLogo from '@/assets/partners/jab-brothers-logo.png';
import nowacoLogo from '@/assets/partners/nowaco-logo.png';
import ajcLogo from '@/assets/partners/ajc-logo.png';
import jMarrLogo from '@/assets/partners/j-marr-logo.png';
import seaproLogo from '@/assets/partners/seapro-logo.png';

const Partners = () => {
  const { elementRef: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.2 });
  const { elementRef: partnersRef, isVisible: partnersVisible } = useScrollAnimation({ threshold: 0.1 });

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

  const globalPartners = [
    {
      name: "Niah Foods UK",
      location: "United Kingdom",
      description: "Premium UK-based food supplier specializing in high-quality frozen products for international markets. Known for exceptional quality standards and reliable supply chain management.",
      specialties: ["Premium Frozen Foods", "Quality Assurance", "UK Market Expertise"],
      established: "2010+",
      logo: niahFoodsLogo
    },
    {
      name: "JAB Brothers",
      location: "Argentina",
      website: "https://www.jab-bros.com.ar/home",
      description: "Family-owned business with over 15 years of experience in production and exportation of frozen foods. Based in the Rio de la Plata region, specializing in premium seafood and beef products.",
      specialties: ["Seafood", "Beef Products", "South American Markets"],
      established: "2008",
      logo: jabBrothersLogo
    },
    {
      name: "NOWACO",
      location: "Netherlands",
      website: "https://nowaco.com",
      description: "Professional food merchant dedicated to providing and selling frozen food on a global scale. With over 50 years of passion in the food trading business.",
      specialties: ["Frozen Meats", "Fish & Seafood", "Vegetables", "Global Trading"],
      established: "1970+",
      logo: nowacoLogo
    },
    {
      name: "AJC International",
      location: "United States",
      website: "https://www.ajcfood.com",
      description: "Leading global frozen food marketer serving more than 140 countries across six continents. Expertise in poultry, pork, meat, vegetables, fruits, and seafood with 400+ branded products.",
      specialties: ["Poultry", "Pork", "Meat", "Vegetables & Fruits", "Seafood"],
      established: "1960+",
      reach: "140+ Countries",
      logo: ajcLogo
    },
    {
      name: "J. Marr",
      location: "United Kingdom",
      website: "https://marsea.co.uk",
      description: "Established UK supplier specializing in premium seafood and meat products. Known for quality Atlantic and global seafood sourcing, as well as premium beef, chicken, and pork products.",
      specialties: ["Atlantic Seafood", "Premium Meat", "Poultry Products"],
      established: "1990+",
      logo: jMarrLogo
    },
    {
      name: "Seapro SAS",
      location: "France",
      website: "https://seaprosas.com/en/",
      description: "Founded in 2006 by food sector experts, Seapro SAS focuses on retail and HORECA format products. Committed to putting customers at the center of priorities with humane and close treatment.",
      specialties: ["Seafood", "Meat & Poultry", "Asian Specialties", "Processed Foods"],
      established: "2006",
      logo: seaproLogo
    }
  ];

  return (
    <>
      <Helmet>
        <title>Global Partners | Trust Link Ventures - Premium Frozen Food Suppliers</title>
        <meta name="description" content="Meet our trusted global partners providing premium frozen seafood and meat products. Strategic partnerships across 6 continents ensuring quality supply chains." />
        <meta name="keywords" content="global partners, frozen food suppliers, seafood partners, meat suppliers, international food trade, supply chain partners" />
        <link rel="canonical" href="https://trustlinkventures.com/partners" />
        <meta property="og:title" content="Global Partners | Trust Link Ventures" />
        <meta property="og:description" content="Our network of trusted global suppliers ensuring premium quality frozen products worldwide." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trustlinkventures.com/partners" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Trust Link Ventures",
            "url": "https://trustlinkventures.com",
            "partner": globalPartners.map(partner => ({
              "@type": "Organization",
              "name": partner.name,
              "url": partner.website,
              "location": {
                "@type": "Place",
                "name": partner.location
              }
            }))
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section ref={heroRef} className="px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="max-w-7xl mx-auto text-center">
            <div className={`transform transition-all duration-1000 ${
              heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6">
                Our Global <span className="text-primary">Partners</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Building strong partnerships across continents to deliver premium frozen products 
                with excellence, reliability, and innovation at every step of the supply chain.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="flex items-center justify-center space-x-3 p-4 rounded-lg bg-primary/5">
                <Globe className="h-8 w-8 text-primary" />
                <span className="text-lg font-semibold">6 Continents</span>
              </div>
              <div className="flex items-center justify-center space-x-3 p-4 rounded-lg bg-primary/5">
                <Users className="h-8 w-8 text-primary" />
                <span className="text-lg font-semibold">Trusted Network</span>
              </div>
              <div className="flex items-center justify-center space-x-3 p-4 rounded-lg bg-primary/5">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-lg font-semibold">Quality Assured</span>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Strategic Partner Section */}
          <section className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Our Strategic Partner
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Partnering with industry leaders to ensure seamless global distribution and premium quality delivery.
              </p>
            </div>

            <Card className="border-primary/20 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-xl sm:text-2xl text-primary">{strategicPartner.name}</CardTitle>
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
                        <div className="h-1.5 w-1.5 bg-primary rounded-full flex-shrink-0"></div>
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
          <section ref={partnersRef} className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Our Trusted Suppliers
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                A carefully curated network of premium suppliers from around the world, 
                ensuring consistent quality and reliable supply chains.
              </p>
            </div>

            {/* Partners Grid with Lazy Loading */}
            <div className={`transform transition-all duration-1000 ${
              partnersVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <PartnerGrid partners={globalPartners} />
            </div>
          </section>

          {/* Supply Chain Excellence */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">
                  Supply Chain Excellence
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Our global partner network ensures seamless logistics, quality control, 
                  and timely delivery across international markets.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
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
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
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
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
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
                  className="w-full h-64 sm:h-80 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <div className="p-6 text-white">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Global Supply Chain</h3>
                    <p className="text-white/90 text-sm sm:text-base">
                      Strategic port operations ensuring seamless global distribution
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Partners;