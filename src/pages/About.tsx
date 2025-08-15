import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, TrendingUp, Award, Shield, Heart, Truck, MapPin, Calendar, Building2, Package, Thermometer, BarChart3, MapPinIcon, Clock, CheckCircle } from 'lucide-react';
import temaPortTrucks from '@/assets/tema-port-trucks.jpg';
import ghanaColdStorageTeam from '@/assets/ghana-cold-storage-team.jpg';
import coldChainBg from '@/assets/cold-chain-bg.jpg';
import distributionBg from '@/assets/distribution-bg.jpg';
import globalSourcingBg from '@/assets/global-sourcing-bg.jpg';
import partnershipBg from '@/assets/partnership-bg.jpg';
import { useCounterAnimation } from '@/hooks/useCounterAnimation';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const About = () => {
  const impactRef = useRef<HTMLDivElement>(null);
  const [isImpactVisible, setIsImpactVisible] = React.useState(false);

  // Counter animations for impact stats - using simple state for now
  const [tonnagesCount, setTonnagesCount] = React.useState(0);
  const [citiesCount, setCitiesCount] = React.useState(0);
  const [yearsCount, setYearsCount] = React.useState(0);
  const [successRate, setSuccessRate] = React.useState(0);

  // Set up intersection observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsImpactVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (impactRef.current) {
      observer.observe(impactRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animate counters when visible
  React.useEffect(() => {
    if (!isImpactVisible) return;

    const animateCounter = (target: number, setter: (val: number) => void, duration = 2000) => {
      let start = 0;
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(easeOutCubic * target);
        
        setter(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Start animations with slight delays
    setTimeout(() => animateCounter(1200, setTonnagesCount), 0);
    setTimeout(() => animateCounter(20, setCitiesCount), 200);
    setTimeout(() => animateCounter(17, setYearsCount), 400);
    setTimeout(() => animateCounter(98, setSuccessRate), 600);
  }, [isImpactVisible]);

  const impactStats = [
    {
      icon: Package,
      value: tonnagesCount,
      suffix: '+',
      label: 'Tonnes/Month Imports',
      description: 'Imports of frozen products',
      color: 'from-amber-400 via-yellow-400 to-orange-500',
      bgColor: 'from-amber-500/20 via-yellow-500/15 to-orange-600/25',
      shadowColor: 'shadow-amber-500/30',
      iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
      progress: (tonnagesCount / 1200) * 100
    },
    {
      icon: MapPinIcon,
      value: citiesCount,
      suffix: '+',
      label: 'Cities Served',
      description: 'Nationwide logistics reach',
      color: 'from-emerald-400 via-green-400 to-teal-500',
      bgColor: 'from-emerald-500/20 via-green-500/15 to-teal-600/25',
      shadowColor: 'shadow-emerald-500/30',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      progress: (citiesCount / 20) * 100
    },
    {
      icon: Clock,
      value: yearsCount,
      suffix: '+',
      label: 'Years in Operation',
      description: 'Established 2006',
      color: 'from-blue-400 via-cyan-400 to-indigo-500',
      bgColor: 'from-blue-500/20 via-cyan-500/15 to-indigo-600/25',
      shadowColor: 'shadow-blue-500/30',
      iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
      progress: (yearsCount / 17) * 100
    },
    {
      icon: CheckCircle,
      value: successRate,
      suffix: '%',
      label: 'Delivery Success Rate',
      description: 'On-time, safe arrivals',
      color: 'from-rose-400 via-pink-400 to-purple-500',
      bgColor: 'from-rose-500/20 via-pink-500/15 to-purple-600/25',
      shadowColor: 'shadow-rose-500/30',
      iconBg: 'bg-gradient-to-br from-rose-400 to-purple-500',
      progress: successRate
    }
  ];
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
      <section className="py-24 bg-background relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-32 border-2 border-primary rounded-full" />
          <div className="absolute bottom-20 right-10 w-24 h-24 border-2 border-secondary rounded-full" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-accent rounded-full" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-6 px-6 py-3 text-sm font-medium">
              <MapPin className="w-4 h-4 mr-2" />
              Our Foundation
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-poppins font-bold mb-8 leading-tight">
              Rooted in <span className="gradient-text relative">
                Ghana
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary opacity-30 rounded-full" />
              </span>. <br />
              Built for the <span className="gradient-text relative">
                World
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-primary opacity-30 rounded-full" />
              </span>.
            </h2>
          </div>

          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Company Establishment */}
            <div className="flex items-start gap-6 p-6 rounded-2xl border border-border/50 bg-gradient-to-r from-accent/5 to-secondary/5 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg leading-relaxed text-foreground">
                  <span className="font-semibold text-primary">Trust Link Ventures Limited (TLVL)</span> is a privately held company established under the 
                  <span className="font-medium text-accent-foreground"> Ghana Companies Code of 1963 (Act 179)</span>, with official certification granted on 
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary font-semibold rounded-md ml-1">
                    <Calendar className="w-4 h-4" />
                    December 20, 2006
                  </span>.
                </p>
              </div>
            </div>

            {/* Growth Story */}
            <div className="flex items-start gap-6 p-6 rounded-2xl border border-border/50 bg-gradient-to-r from-secondary/5 to-accent/5 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-lg leading-relaxed text-foreground">
                  Originally founded as a <span className="font-medium text-muted-foreground">small-scale frozen food trading company</span>, TLVL has grown into 
                  <span className="font-semibold text-secondary"> one of Ghana's leading importers and distributors</span> of frozen foods, including 
                  <span className="font-medium text-primary">fish, poultry, and beef</span>.
                </p>
              </div>
            </div>

            {/* Current Operations */}
            <div className="flex items-start gap-6 p-6 rounded-2xl border border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-lg leading-relaxed text-foreground">
                  Operating from <span className="font-semibold text-primary">Tema</span>, we now handle over 
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent font-bold rounded-md mx-1 text-xl">
                    1,200 tonnes
                  </span> 
                  of imports per month, with a <span className="font-medium text-secondary">nationwide cold-chain distribution network</span> that ensures goods reach consumers 
                  <span className="font-medium text-accent">swiftly and safely</span>.
                </p>
              </div>
            </div>

            {/* Mission Statement - Pull Quote Style */}
            <div className="relative my-12">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-secondary rounded-full" />
              <blockquote className="pl-8 py-4">
                <p className="text-xl lg:text-2xl font-medium leading-relaxed text-foreground italic">
                  "Our story is one of <span className="text-primary font-semibold not-italic">resilience</span>, 
                  <span className="text-secondary font-semibold not-italic"> local innovation</span>, and 
                  <span className="text-accent font-semibold not-italic"> international standards</span>."
                </p>
                <div className="mt-4 h-px bg-gradient-to-r from-primary via-secondary to-accent w-32" />
                <p className="mt-4 text-lg text-muted-foreground font-medium">
                  We believe that trusted logistics and quality food distribution can 
                  <span className="text-primary font-semibold"> transform economies</span>, 
                  <span className="text-secondary font-semibold"> improve lives</span>, and 
                  <span className="text-accent font-semibold"> build long-term prosperity</span>.
                </p>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Our Key Differentiators Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold mb-4">
              Our <span className="gradient-text">Key Differentiators</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              What sets us apart in Ghana's frozen food distribution landscape.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Certified Cold-Chain Logistics */}
            <Card className="card-elevated text-center p-6 hover-lift animate-fade-in relative overflow-hidden group">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                style={{ backgroundImage: `url(${coldChainBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-teal-900/60 via-teal-800/40 to-teal-700/70" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-teal-700/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                  <Thermometer className="w-8 h-8 text-teal-50" />
                </div>
                <h3 className="font-poppins font-bold text-lg mb-4 text-white drop-shadow-lg">
                  Certified Cold-Chain Logistics
                </h3>
                <p className="text-sm text-teal-50 leading-relaxed drop-shadow-md">
                  Consistent sub-zero preservation from port to plate with state-of-the-art refrigeration systems.
                </p>
              </div>
            </Card>

            {/* Nationwide Distribution */}
            <Card className="card-elevated text-center p-6 hover-lift animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.1s' }}>
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                style={{ backgroundImage: `url(${distributionBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-green-900/60 via-green-800/40 to-green-700/70" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-green-700/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                  <Truck className="w-8 h-8 text-green-50" />
                </div>
                <h3 className="font-poppins font-bold text-lg mb-4 text-white drop-shadow-lg">
                  Nationwide Distribution
                </h3>
                <p className="text-sm text-green-50 leading-relaxed drop-shadow-md">
                  Fast and reliable delivery to all major markets in Ghana through our comprehensive logistics network.
                </p>
              </div>
            </Card>

            {/* Global Sourcing at Scale */}
            <Card className="card-elevated text-center p-6 hover-lift animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.2s' }}>
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                style={{ backgroundImage: `url(${globalSourcingBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900/60 via-purple-800/40 to-purple-700/70" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-purple-700/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-purple-50" />
                </div>
                <h3 className="font-poppins font-bold text-lg mb-4 text-white drop-shadow-lg">
                  Global Sourcing at Scale
                </h3>
                <p className="text-sm text-purple-50 leading-relaxed drop-shadow-md">
                  Frozen foods sourced through verified global suppliers ensuring quality and reliability.
                </p>
              </div>
            </Card>

            {/* Customer-Centric Partnership */}
            <Card className="card-elevated text-center p-6 hover-lift animate-fade-in relative overflow-hidden group" style={{ animationDelay: '0.3s' }}>
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                style={{ backgroundImage: `url(${partnershipBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-orange-900/60 via-orange-800/40 to-orange-700/70" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-orange-700/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-orange-50" />
                </div>
                <h3 className="font-poppins font-bold text-lg mb-4 text-white drop-shadow-lg">
                  Customer-Centric Partnership
                </h3>
                <p className="text-sm text-orange-50 leading-relaxed drop-shadow-md">
                  Built on transparency, service excellence, and respect with our valued partners.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Snapshot Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 relative overflow-hidden">
        {/* Complex Background Pattern */}
        <div className="absolute inset-0">
          {/* Geometric Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
                <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill="currentColor"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" className="text-emerald-400"/>
              <rect width="100%" height="100%" fill="url(#dots)" className="text-green-300"/>
            </svg>
          </div>
          
          {/* Floating Circles */}
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-2 border-emerald-400/30 animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full border border-green-300/20 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full border border-teal-400/40 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/4 left-3/4 w-36 h-36 rounded-full border-2 border-cyan-400/25 animate-pulse" style={{ animationDelay: '3s' }} />
          
          {/* Hexagonal Pattern */}
          <div className="absolute top-20 right-20 w-20 h-20 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-400">
              <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="absolute bottom-32 left-32 w-16 h-16 opacity-15">
            <svg viewBox="0 0 100 100" className="w-full h-full text-orange-400">
              <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-gradient-radial from-emerald-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-gradient-radial from-teal-500/25 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-5xl font-poppins font-bold mb-6 text-white">
              Our Impact in <span className="bg-gradient-to-r from-emerald-300 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Numbers</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-emerald-400 via-yellow-400 to-orange-500 mx-auto mb-6 rounded-full" />
            <p className="text-emerald-100 text-lg max-w-2xl mx-auto">
              Delivering excellence across Ghana's frozen food supply chain.
            </p>
          </div>

          <div ref={impactRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {impactStats.map((stat, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden group hover:scale-105 transition-all duration-500 hover:shadow-2xl ${stat.shadowColor} animate-fade-in border-0`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Card Background with Pattern */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor}`} />
                <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
                
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 60 60" preserveAspectRatio="none">
                    <defs>
                      <pattern id={`pattern-${index}`} width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="15" cy="15" r="2" fill="currentColor" className="text-white"/>
                        <path d="M0,15 Q15,0 30,15 T60,15" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-white"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#pattern-${index})`} />
                  </svg>
                </div>

                <CardContent className="p-8 text-center relative z-10">
                  {/* Icon with enhanced styling */}
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 ${stat.iconBg} rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-all duration-500 shadow-2xl ${stat.shadowColor} group-hover:shadow-3xl`}>
                      <stat.icon className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/20 to-transparent animate-pulse opacity-50" />
                    
                    {/* Floating particles effect */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/40 rounded-full animate-ping" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
                  </div>

                  {/* Enhanced counter display */}
                  <div className="mb-6">
                    <div className={`text-5xl lg:text-6xl font-poppins font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg`}>
                      {stat.value}{stat.suffix}
                    </div>
                    
                    {/* Enhanced Progress bar */}
                    <div className="relative w-full bg-black/20 rounded-full h-3 mb-4 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      <div 
                        className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-2000 ease-out relative overflow-hidden`}
                        style={{ 
                          width: `${Math.min(stat.progress, 100)}%`,
                          transform: isImpactVisible ? 'translateX(0)' : 'translateX(-100%)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced text styling */}
                  <div className="text-white font-bold text-lg mb-3 drop-shadow-md">
                    {stat.label}
                  </div>
                  <div className="text-white/80 text-sm leading-relaxed">
                    {stat.description}
                  </div>

                  {/* Enhanced decorative corner accent */}
                  <div className={`absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] transition-all duration-300 ${
                    index % 4 === 0 ? 'border-t-amber-400/30 group-hover:border-t-amber-400/60' :
                    index % 4 === 1 ? 'border-t-emerald-400/30 group-hover:border-t-emerald-400/60' :
                    index % 4 === 2 ? 'border-t-blue-400/30 group-hover:border-t-blue-400/60' :
                    'border-t-rose-400/30 group-hover:border-t-rose-400/60'
                  }`} />
                  
                  {/* Glowing border effect */}
                  <div className={`absolute inset-0 rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    index % 4 === 0 ? 'border-amber-400/50' :
                    index % 4 === 1 ? 'border-emerald-400/50' :
                    index % 4 === 2 ? 'border-blue-400/50' :
                    'border-rose-400/50'
                  }`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced bottom section */}
          <div className="mt-20 text-center">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl px-8 py-4 text-white border border-white/10 shadow-2xl">
              <BarChart3 className="w-6 h-6 text-emerald-400 animate-pulse" />
              <span className="text-lg font-medium bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">
                Growing stronger every year since 2006
              </span>
              <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-pulse" />
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