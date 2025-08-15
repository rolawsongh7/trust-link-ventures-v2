import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, TrendingUp, Award, Shield, Heart, Truck, MapPin, Calendar, Building2, Package, Thermometer, BarChart3, MapPinIcon, Clock, CheckCircle, Target, Lightbulb, Flag, Navigation } from 'lucide-react';
import temaPortTrucks from '@/assets/tema-port-trucks.jpg';
import ghanaColdStorageTeam from '@/assets/ghana-cold-storage-team.jpg';
import coldChainBg from '@/assets/cold-chain-bg.jpg';
import distributionBg from '@/assets/distribution-bg.jpg';
import globalSourcingBg from '@/assets/global-sourcing-bg.jpg';
import partnershipBg from '@/assets/partnership-bg.jpg';
import incorporation2006 from '@/assets/timeline/2006-incorporation.jpg';
import temaExpansion2010 from '@/assets/timeline/2010-tema-expansion.jpg';
import coldStorage2015 from '@/assets/timeline/2015-cold-storage.jpg';
import globalPartnerships2020 from '@/assets/timeline/2020-global-partnerships.jpg';
import tonnes2024 from '@/assets/timeline/2024-1200-tonnes.jpg';
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
  
  // Timeline carousel state
  const [currentTimelineIndex, setCurrentTimelineIndex] = React.useState(0);
  
  const timelineEvents = [
    {
      year: '2006',
      icon: Flag,
      title: 'Company Incorporated',
      description: 'Trust Link Ventures Limited officially established under Ghana Companies Code of 1963 (Act 179).',
      gradient: 'from-blue-500 to-blue-700',
      image: incorporation2006
    },
    {
      year: '2010',
      icon: Navigation,
      title: 'Expanded to Tema Industrial Hub',
      description: 'Established our main operations center at Tema Port to optimize import and distribution capabilities.',
      gradient: 'from-green-500 to-green-700',
      image: temaExpansion2010
    },
    {
      year: '2015',
      icon: Thermometer,
      title: 'Nationwide Cold-Store Partnerships',
      description: 'Launched comprehensive cold storage partnerships across Ghana, ensuring nationwide reach.',
      gradient: 'from-purple-500 to-purple-700',
      image: coldStorage2015
    },
    {
      year: '2020',
      icon: Globe,
      title: 'Cross-Border Partnerships Initiated',
      description: 'Expanded international partnerships to enhance global sourcing and supply chain efficiency.',
      gradient: 'from-orange-500 to-orange-700',
      image: globalPartnerships2020
    },
    {
      year: '2024',
      icon: TrendingUp,
      title: 'Monthly Throughput Exceeds 1,200 Tonnes',
      description: 'Achieved major milestone with monthly imports exceeding 1,200 tonnes of frozen products.',
      gradient: 'from-emerald-500 to-emerald-700',
      image: tonnes2024
    }
  ];

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

  // Timeline carousel auto-advance
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimelineIndex((prev) => (prev + 1) % timelineEvents.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [timelineEvents.length]);

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

      {/* Mission & Vision Statement Section */}
      <section className="py-24 bg-accent/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Our Mission */}
            <Card className="card-elevated animate-fade-in hover-lift">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-poppins font-bold">
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-center">
                  To meet and exceed consumer demand by consistently importing and exporting high-quality 
                  frozen foods that adhere to global standards of freshness, safety, and reliability.
                </p>
              </CardContent>
            </Card>

            {/* Our Vision */}
            <Card className="card-elevated animate-fade-in hover-lift" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl font-poppins font-bold">
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-center">
                  To become a national leader in the delivery of premium frozen food products in Ghana by fulfilling 
                  customer expectations in quality and service, while advancing the growth of Ghana's local fishing 
                  industry through internationally benchmarked practices.
                </p>
              </CardContent>
            </Card>
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

      {/* Our Journey Timeline Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-5xl font-poppins font-bold mb-6 text-foreground">
              Our <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Journey</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 mx-auto mb-6 rounded-full" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From incorporation to becoming Ghana's trusted frozen food distribution leader.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Timeline Container */}
             <div className="relative h-96 overflow-hidden rounded-2xl backdrop-blur-sm border border-border/30">
               {timelineEvents.map((event, index) => (
                 <div
                   key={index}
                   className={`absolute inset-0 transition-all duration-800 ease-out ${
                     index === currentTimelineIndex
                       ? 'opacity-100 scale-100'
                       : 'opacity-0 scale-95'
                   }`}
                 >
                   {/* Background Image */}
                   <div 
                     className="absolute inset-0 bg-cover bg-center"
                     style={{ backgroundImage: `url(${event.image})` }}
                   />
                   <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-30`} />
                   <div className="absolute inset-0 bg-background/20" />
                   
                   <div className="relative z-10 flex items-center justify-center h-full p-12">
                     <div className="text-center">
                       {/* Year Badge */}
                       <div className="inline-flex items-center justify-center w-20 h-20 bg-background/80 backdrop-blur-sm rounded-full mb-8 shadow-2xl border border-border">
                         <span className="text-foreground text-2xl font-bold drop-shadow-lg">{event.year}</span>
                       </div>
                       
                       {/* Content */}
                       <h3 className="text-2xl lg:text-3xl font-poppins font-bold text-foreground mb-4 drop-shadow-lg">
                         {event.title}
                       </h3>
                       <p className="text-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                         {event.description}
                       </p>
                     </div>
                   </div>
                 </div>
               ))}
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center mt-8 space-x-3">
              {timelineEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTimelineIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTimelineIndex
                      ? 'bg-gradient-to-r from-emerald-400 to-blue-400 scale-125'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            {/* Timeline Progress Bar */}
            <div className="mt-8 relative">
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 h-2 rounded-full transition-all duration-4000 ease-linear"
                  style={{ width: `${((currentTimelineIndex + 1) / timelineEvents.length) * 100}%` }}
                />
              </div>
            </div>
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

      {/* Our Journey Timeline Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-5xl font-poppins font-bold mb-6 text-foreground">
              Our <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Journey</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 mx-auto mb-6 rounded-full" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From incorporation to becoming Ghana's trusted frozen food distribution leader.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Timeline content */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              {timelineEvents.map((event, index) => (
                <div
                  key={event.year}
                  className={`${
                    index === currentTimelineIndex ? 'block' : 'hidden'
                  } relative min-h-[600px] flex items-center justify-center text-white transition-all duration-500`}
                  style={{
                    backgroundImage: `url(${event.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-black/30 opacity-30" />
                  <div className="relative z-10 text-center px-8 py-16 max-w-2xl">
                    <div className="text-6xl lg:text-8xl font-bold mb-4 opacity-90">
                      {event.year}
                    </div>
                    <h3 className="text-2xl lg:text-4xl font-bold mb-6 leading-tight">
                      {event.title}
                    </h3>
                    <p className="text-lg lg:text-xl leading-relaxed opacity-95">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Navigation */}
            <div className="flex justify-center mt-8 space-x-3">
              {timelineEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTimelineIndex(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentTimelineIndex
                      ? 'bg-primary scale-125 shadow-lg'
                      : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;