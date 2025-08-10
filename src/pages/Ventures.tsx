import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Package, TrendingUp, ExternalLink, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Ventures = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    market: '',
    message: ''
  });

  const ventures = [
    {
      title: 'Premium Frozen Seafood to West Africa',
      location: 'Argentina → Senegal, Ghana, Nigeria',
      timeline: '3-month delivery cycles',
      volume: '500 tons per shipment',
      description: 'Sourcing premium frozen seafood from Argentine waters and delivering to major West African markets through our cold chain logistics network.',
      results: [
        '2,500 tons delivered successfully',
        '98% on-time delivery rate',
        '15% cost reduction vs. competitors',
        '3 new processing partnerships'
      ],
      status: 'Active',
      category: 'Food Export'
    },
    {
      title: 'Organic Beef Export Initiative',
      location: 'Brazil → Middle East',
      timeline: 'Quarterly shipments',
      volume: '300 tons per quarter',
      description: 'Establishing sustainable beef export channels from certified organic farms in Brazil to premium markets in the UAE and Saudi Arabia.',
      results: [
        '1,200 tons exported annually',
        '100% halal certification compliance',
        '25% premium pricing achieved',
        '2 major retail partnerships'
      ],
      status: 'Active',
      category: 'Food Export'
    },
    {
      title: 'Cold Chain Technology Venture',
      location: 'Global',
      timeline: 'Ongoing development',
      volume: 'Technology platform',
      description: 'Developing next-generation IoT-enabled cold chain monitoring systems to revolutionize food safety and reduce waste.',
      results: [
        '50% reduction in temperature variance',
        '30% decrease in food waste',
        '$2M seed funding raised',
        '5 pilot customers onboarded'
      ],
      status: 'Growing',
      category: 'Technology'
    },
    {
      title: 'Sustainable Packaging Solutions',
      location: 'Southeast Asia → Global',
      timeline: '18-month rollout',
      volume: 'B2B Platform',
      description: 'Building a venture focused on biodegradable packaging solutions for food exports, sourced from sustainable materials in Southeast Asia.',
      results: [
        '60% plastic reduction achieved',
        '12 manufacturing partners',
        'ISO 14001 certification',
        '8 countries market entry'
      ],
      status: 'Expanding',
      category: 'Sustainability'
    },
    {
      title: 'Agricultural Finance Platform',
      location: 'Latin America',
      timeline: '2-year development',
      volume: 'Fintech Solution',
      description: 'Creating a digital platform that provides smallholder farmers with access to trade finance and direct market connections.',
      results: [
        '1,000+ farmers onboarded',
        '$5M in financing facilitated',
        '40% increase in farmer income',
        '3 countries operational'
      ],
      status: 'Scaling',
      category: 'Fintech'
    },
    {
      title: 'Aquaculture Innovation Hub',
      location: 'Norway → Asia Pacific',
      timeline: 'Multi-year initiative',
      volume: 'Industry Partnership',
      description: 'Partnering with Norwegian aquaculture leaders to bring sustainable fish farming technology and practices to emerging markets.',
      results: [
        '20% improvement in yield',
        '35% reduction in environmental impact',
        '4 technology transfers completed',
        '2 joint ventures established'
      ],
      status: 'Active',
      category: 'Innovation'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would integrate with Supabase CRM
    console.log('Venture pitch submitted:', formData);
    // Reset form
    setFormData({
      name: '',
      email: '',
      company: '',
      market: '',
      message: ''
    });
    alert('Thank you for your submission! We\'ll review your proposal and get back to you within 48 hours.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500';
      case 'Growing': return 'bg-primary';
      case 'Expanding': return 'bg-secondary';
      case 'Scaling': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Food Export': return '🚢';
      case 'Technology': return '💻';
      case 'Sustainability': return '🌱';
      case 'Fintech': return '💰';
      case 'Innovation': return '🔬';
      default: return '📦';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-accent to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl lg:text-6xl font-poppins font-bold mb-6">
              Our <span className="gradient-text">Ventures</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Discover our portfolio of successful ventures and partnerships that are transforming global trade and creating sustainable impact worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <Card className="card-elevated text-center p-6 animate-scale-in">
              <div className="text-3xl font-poppins font-bold gradient-text mb-2">150+</div>
              <div className="text-muted-foreground">Active Ventures</div>
            </Card>
            <Card className="card-elevated text-center p-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl font-poppins font-bold gradient-text mb-2">45+</div>
              <div className="text-muted-foreground">Countries</div>
            </Card>
            <Card className="card-elevated text-center p-6 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl font-poppins font-bold gradient-text mb-2">$50M+</div>
              <div className="text-muted-foreground">Value Created</div>
            </Card>
            <Card className="card-elevated text-center p-6 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl font-poppins font-bold gradient-text mb-2">98%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Ventures Grid */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {ventures.map((venture, index) => (
              <Card 
                key={index} 
                className="card-elevated hover-lift transition-smooth animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCategoryIcon(venture.category)}</span>
                      <div>
                        <CardTitle className="text-xl font-poppins">
                          {venture.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(venture.status)}`}
                          >
                            {venture.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {venture.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {venture.description}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-border">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{venture.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{venture.timeline}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{venture.volume}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">High Impact</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Key Results</h4>
                    <ul className="space-y-2">
                      {venture.results.map((result, idx) => (
                        <li key={idx} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-muted-foreground">{result}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="w-full btn-outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pitch Form Section */}
      <section className="py-24 bg-accent/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="card-elevated animate-fade-in">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-poppins font-bold mb-4">
                Pitch Us Your <span className="gradient-text">Market Need</span>
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Have a market opportunity or venture idea? We'd love to hear from you. Our team reviews every submission and responds within 48 hours.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company/Organization</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market">Target Market/Region</Label>
                    <Input
                      id="market"
                      name="market"
                      value={formData.market}
                      onChange={handleInputChange}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Describe Your Venture Idea or Market Need *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="bg-background"
                    placeholder="Tell us about your market opportunity, venture idea, or partnership proposal. Include details about potential volume, timeline, and expected outcomes."
                  />
                </div>

                <Button type="submit" className="w-full btn-hero">
                  <Send className="h-5 w-5 mr-2" />
                  Submit Your Pitch
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-primary-foreground mb-6">
            Ready to Scale Your Impact?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join our portfolio of successful ventures and create lasting change in global trade.
          </p>
          <Button 
            asChild 
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4 font-semibold hover:scale-105 transition-smooth"
          >
            <Link to="/contact">
              Discuss Partnership
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Ventures;