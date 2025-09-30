import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Globe, Users, Truck, Shield } from 'lucide-react';
import PartnerGrid from '@/components/partners/PartnerGrid';
import portFleetAerial from '@/assets/port-fleet-aerial.jpg';
import partnershipsHeroBg from '@/assets/partnerships-hero-bg.jpg';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Helmet } from 'react-helmet-async';

// Partner logos - Updated
import niahFoodsLogoNew from '@/assets/partners/niah-foods-logo.png';
import jabBrothersLogo from '@/assets/partners/jab-brothers-logo.png';
import nowacoLogoNew from '@/assets/partners/nowaco-logo.png';
import ajcLogo from '@/assets/partners/ajc-logo.png';
import jMarrLogo from '@/assets/partners/j-marr-logo.png';
import seaproLogo from '@/assets/partners/seapro-logo.png';

const Partners = () => {
  const { elementRef: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.2 });
  const { elementRef: partnersRef, isVisible: partnersVisible } = useScrollAnimation({ threshold: 0.1 });

  const strategicPartner = {
    name: "New Gen Link",
    location: "Global Operations", 
    website: "https://nglglobalmarkets.com",
    description: "New Gen Link serves as a vital bridge between premium seafood and meat exporters in Europe and the U.S. and the rapidly expanding food distribution networks across West Africa. With proven expertise in international trade, cold-chain logistics, and regulatory compliance, the company has become a trusted partner for businesses seeking reliable access to world-class products.",
    services: [
      "Premium Sourcing – Direct partnerships with certified suppliers of frozen seafood, premium beef, and specialty meats",
      "Cold-Chain Excellence – End-to-end integrity from source to destination, ensuring consistent freshness and quality",
      "Trusted Network – A growing reputation among wholesalers, retailers, and food service providers across Ghana and the wider region",
      "Regulatory Expertise – Skilled in navigating complex international trade rules while meeting global food safety standards",
      "Commitment to Sustainability – Originally founded on sustainable sourcing, and still driven by transparency and responsibility"
    ]
  };

  const globalPartners = [
    {
      name: "Niah Foods UK",
      location: "United Kingdom",
      description: "Premium UK-based food supplier specializing in high-quality frozen products for international markets. Known for exceptional quality standards and reliable supply chain management.",
      specialties: ["Premium Frozen Foods", "Quality Assurance", "UK Market Expertise"],
      established: "2010+",
      logo: niahFoodsLogoNew
    },
    {
      name: "JAB Bros. Company LLC",
      location: "United States",
      website: "https://www.jab-bros.com.ar",
      description: "JAB Bros. Company LLC operates from North Miami, Florida, serving as a strategic distribution hub for premium frozen food products. With extensive experience in international food trade and logistics.",
      specialties: ["Frozen Food Distribution", "International Trade", "Logistics Solutions"],
      established: "2008+",
      reach: "North American Markets",
      logo: jabBrothersLogo
    },
    {
      name: "NOWACO",
      location: "Netherlands",
      website: "https://nowaco.com",
      description: "Professional food merchant dedicated to providing and selling frozen food on a global scale. With over 50 years of passion in the food trading business.",
      specialties: ["Frozen Meats", "Fish & Seafood", "Vegetables", "Global Trading"],
      established: "1970+",
      logo: nowacoLogoNew
    },
    {
      name: "AJC International",
      location: "United States",
      website: "https://www.ajcfood.com",
      description: "Leading global frozen food marketer headquartered in Atlanta, Georgia, serving more than 140 countries across six continents. Expertise in poultry, pork, meat, vegetables, fruits, and seafood with 400+ branded products.",
      specialties: ["Poultry", "Pork", "Meat", "Vegetables & Fruits", "Seafood"],
      established: "1960+",
      reach: "140+ Countries",
      logo: ajcLogo
    },
    {
      name: "J Marr (Seafoods) Limited",
      location: "United Kingdom",
      website: "https://marsea.co.uk",
      description: "Established UK supplier operating from Hessle, East Yorkshire, specializing in premium seafood and meat products. Known for quality Atlantic and global seafood sourcing, as well as premium beef, chicken, and pork products.",
      specialties: ["Atlantic Seafood", "Premium Meat", "Poultry Products"],
      established: "1990+",
      logo: jMarrLogo
    },
    {
      name: "SEAPRO SAS",
      location: "France",
      website: "https://seaprosas.com/en/",
      description: "Founded in 2006 by food sector experts, SEAPRO SAS operates from Cabestany, France, focusing on retail and HORECA format products. Committed to putting customers at the center with humane and close treatment.",
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
        <section 
          ref={heroRef as React.RefObject<HTMLElement>} 
          className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${partnershipsHeroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          
          {/* Content */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className={`transform transition-all duration-1000 ${
              heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 text-white leading-tight">
                Our Global <span className="text-primary">Partners</span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-4xl mx-auto mb-8 md:mb-12 leading-relaxed px-4">
                Building strong partnerships across continents to deliver premium frozen products 
                with excellence, reliability, and innovation at every step of the supply chain.
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-300 touch-manipulation">
                <Globe className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
                <span className="text-base md:text-lg font-semibold text-white text-center sm:text-left">6 Continents</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-300 touch-manipulation">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
                <span className="text-base md:text-lg font-semibold text-white text-center sm:text-left">Trusted Network</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-300 touch-manipulation">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />
                <span className="text-base md:text-lg font-semibold text-white text-center sm:text-left">Quality Assured</span>
              </div>
            </div>
          </div>
        </section>

        {/* White space after hero */}
        <div className="py-8 md:py-12 bg-background"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Strategic Partner Section */}
          <section className="mb-16 md:mb-20">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Our Strategic Partner
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                Partnering with industry leaders to ensure seamless global distribution and premium quality delivery.
              </p>
            </div>

            <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:border-primary/30">
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl text-primary">{strategicPartner.name}</CardTitle>
                  <Badge variant="secondary" className="flex items-center space-x-1 w-fit">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs md:text-sm">{strategicPartner.location}</span>
                  </Badge>
                </div>
                <CardDescription className="text-sm md:text-base leading-relaxed">
                  {strategicPartner.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 p-4 md:p-6 pt-0">
                <div>
                  <h4 className="font-semibold mb-3 text-sm md:text-base">Key Services</h4>
                  <ul className="space-y-3">
                    {strategicPartner.services.map((service, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                        <span className="text-xs md:text-sm text-muted-foreground leading-relaxed">{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button asChild className="w-full h-12 touch-manipulation">
                  <a href={strategicPartner.website} target="_blank" rel="noopener noreferrer">
                    Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Global Partners Section */}
          <section ref={partnersRef as React.RefObject<HTMLElement>} className="mb-16 md:mb-20">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Our Trusted Suppliers
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 px-4 leading-relaxed">
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
          <section className="pb-8 md:pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">
                  Supply Chain Excellence
                </h2>
                <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                  Our global partner network ensures seamless logistics, quality control, 
                  and timely delivery across international markets.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-muted/50 transition-colors duration-300">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <Truck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Global Logistics Network</h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        Efficient transportation and distribution systems spanning multiple continents.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-muted/50 transition-colors duration-300">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Quality Assurance</h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        Rigorous quality control standards maintained across all partner facilities.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-muted/50 transition-colors duration-300">
                    <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                      <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Market Expertise</h3>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        Deep understanding of local markets and regulatory requirements worldwide.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-lg order-1 lg:order-2">
                <img 
                  src={portFleetAerial} 
                  alt="Aerial view of cargo ships docking at commercial port"
                  className="w-full h-48 sm:h-64 md:h-80 object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <div className="p-4 md:p-6 text-white">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">Global Supply Chain</h3>
                    <p className="text-white/90 text-xs sm:text-sm md:text-base leading-relaxed">
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