import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, TrendingUp, Award, Shield, Heart, Truck, MapPin } from 'lucide-react';
import temaPortTrucks from '@/assets/tema-port-trucks.jpg';
import logisticsTeam from '@/assets/logistics-team-ghana.jpg';

const About = () => {
  const values = [
    {
      icon: Shield,
      title: 'Trust & Reliability',
      description: 'Building lasting partnerships through transparent and reliable business practices.'
    },
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Putting our clients\' needs at the center of everything we do.'
    },
    {
      icon: TrendingUp,
      title: 'Innovation',
      description: 'Continuously improving our services and embracing new technologies.'
    },
    {
      icon: Globe,
      title: 'Global Impact',
      description: 'Creating sustainable connections that benefit communities worldwide.'
    }
  ];

  const stats = [
    { label: 'Years in Business', value: '15+' },
    { label: 'Countries Served', value: '45+' },
    { label: 'Successful Ventures', value: '150+' },
    { label: 'Customer Satisfaction', value: '98%' }
  ];

  const team = [
    {
      name: 'James Marr',
      role: 'Founder & CEO',
      expertise: 'International Trade, Business Development',
      description: 'Over 20 years of experience in global trade and venture development.'
    },
    {
      name: 'Sarah Chen',
      role: 'Head of Operations',
      expertise: 'Supply Chain, Logistics',
      description: 'Expert in optimizing global supply chains and operational efficiency.'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Director of Technology',
      expertise: 'Digital Innovation, Platform Development',
      description: 'Leading digital transformation and technology innovation initiatives.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${temaPortTrucks})` }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/20 to-background/35" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center animate-fade-in">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-poppins font-bold text-white drop-shadow-lg">
              Powering Cold Chain Logistics. <br />
              <span className="gradient-text">Delivering Trust.</span>
            </h1>
          </div>
          <div className="text-center mt-auto mb-4">
            <p className="text-xl text-white/90 max-w-4xl mx-auto leading-relaxed drop-shadow-md">
              From humble beginnings to 1,200 tonnes monthly, Trust Link Ventures connects Ghana to the world's most reliable cold-chain food supply.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <Badge variant="outline" className="mb-4 px-4 py-2">
                <MapPin className="w-4 h-4 mr-2" />
                Our Foundation
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold mb-6">
                Rooted in <span className="gradient-text">Ghana</span>. <br />
                Built for the <span className="gradient-text">World</span>.
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Trust Link Ventures Limited (TLVL) is a privately held company established under the Ghana Companies Code of 1963 (Act 179), with official certification granted on December 20, 2006.
                </p>
                <p>
                  Originally founded as a small-scale frozen food trading company, TLVL has grown into one of Ghana's leading importers and distributors of frozen foods, including fish, poultry, and beef.
                </p>
                <p>
                  Operating from Tema, we now handle over 1,200 tonnes of imports per month, with a nationwide cold-chain distribution network that ensures goods reach consumers swiftly and safely.
                </p>
                <p className="text-primary font-medium">
                  Our story is one of resilience, local innovation, and international standards. We believe that trusted logistics and quality food distribution can transform economies, improve lives, and build long-term prosperity.
                </p>
              </div>
            </div>
            
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Card className="card-elevated overflow-hidden">
                <div className="aspect-[4/3] relative">
                  <img 
                    src={logisticsTeam} 
                    alt="Trust Link Ventures logistics team in Ghana"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-poppins font-semibold mb-2">Our Team in Action</h3>
                  <p className="text-sm text-muted-foreground">
                    Professional logistics operations across Ghana, ensuring quality and reliability in every delivery.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="card-elevated text-center p-6 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl font-poppins font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="card-elevated animate-fade-in">
              <CardHeader>
                <CardTitle className="text-2xl font-poppins flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-primary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  To facilitate meaningful global trade connections that create value for businesses, 
                  communities, and economies worldwide. We believe in building bridges between markets, 
                  fostering innovation, and driving sustainable growth through strategic partnerships.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-2xl font-poppins flex items-center">
                  <Award className="w-6 h-6 mr-3 text-primary" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  To be the world's most trusted platform for global trade and venture development, 
                  where businesses of all sizes can discover opportunities, build partnerships, 
                  and achieve sustainable success in the international marketplace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold mb-4">
              Our <span className="gradient-text">Values</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The principles that guide our decisions and shape our relationships with partners worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="card-elevated text-center p-6 hover-lift animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-poppins font-semibold mb-3">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold mb-4">
              Meet Our <span className="gradient-text">Leadership Team</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experienced professionals dedicated to driving global trade innovation and excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="card-elevated hover-lift animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-center font-poppins">{member.name}</CardTitle>
                  <Badge variant="secondary" className="mx-auto w-fit">{member.role}</Badge>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-primary font-medium mb-3">{member.expertise}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {member.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="card-elevated animate-fade-in">
            <CardHeader>
              <CardTitle className="text-3xl font-poppins font-bold text-center mb-4">
                Our <span className="gradient-text">Story</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none">
              <div className="space-y-6 text-muted-foreground">
                <p>
                  Founded in 2009, Trust Link Ventures began as a vision to simplify global trade 
                  and create meaningful connections between businesses across different continents. 
                  What started as a small trading company has evolved into a comprehensive platform 
                  that facilitates international partnerships and drives innovation in global commerce.
                </p>
                <p>
                  Over the years, we have successfully connected thousands of businesses, facilitated 
                  trade worth millions of dollars, and helped companies enter new markets with confidence. 
                  Our expertise spans multiple industries, from food and agriculture to technology and 
                  sustainable solutions.
                </p>
                <p>
                  Today, we continue to innovate and adapt to the changing needs of global trade, 
                  leveraging technology to create more efficient, transparent, and sustainable 
                  business relationships. Our commitment to excellence and customer success remains 
                  at the heart of everything we do.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default About;