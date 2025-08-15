import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, CheckCircle, Shield, Globe, Users, Package, Star, Quote, ShoppingCart, Handshake, TrendingUp, MessageCircle, ArrowRight, Verified, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import contactHeroBg from '@/assets/contact-hero-bg.jpg';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    country: '',
    inquiryType: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  const ctaOptions = [
    {
      title: 'Request a Quote',
      description: 'Get competitive pricing for bulk frozen food imports',
      icon: ShoppingCart,
      tag: 'buyer_inquiry',
      gradient: 'from-blue-500 to-blue-700',
      bgGradient: 'from-blue-500/20 to-blue-700/10'
    },
    {
      title: 'Pitch a Partnership',
      description: 'Explore strategic alliances and joint ventures',
      icon: Handshake,
      tag: 'partner_pitch',
      gradient: 'from-green-500 to-green-700',
      bgGradient: 'from-green-500/20 to-green-700/10'
    },
    {
      title: 'Investor Opportunities',
      description: 'Discover growth opportunities in African logistics',
      icon: TrendingUp,
      tag: 'investor_lead',
      gradient: 'from-purple-500 to-purple-700',
      bgGradient: 'from-purple-500/20 to-purple-700/10'
    },
    {
      title: 'General Contact',
      description: 'Connect with our team for any other inquiries',
      icon: MessageCircle,
      tag: 'general_contact',
      gradient: 'from-orange-500 to-orange-700',
      bgGradient: 'from-orange-500/20 to-orange-700/10'
    }
  ];

  const certifications = [
    { name: 'HACCP Certified', icon: Verified },
    { name: 'Halal Compliance', icon: Award },
    { name: 'ISO 22000 Food Safety', icon: Shield }
  ];

  const miniStats = [
    { label: 'Tons Delivered', value: '1,200+', icon: Package },
    { label: 'Global Markets', value: '10+', icon: Globe },
    { label: 'Partner Retention Rate', value: '98%', icon: Users },
  ];

  const testimonials = [
    {
      text: "Trust Link Ventures made sourcing in West Africa seamless—from sourcing to final-mile delivery, we knew we had the right partner.",
      author: "Mariam B.",
      role: "Regional Buyer, Lagos"
    },
    {
      text: "Their attention to temperature control and export compliance is unmatched. Highly recommended for any serious buyer.",
      author: "Kwame O.",
      role: "Logistics Director, Accra"
    }
  ];

  // Carousel auto-advance
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % ctaOptions.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ctaOptions.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast.success('Thank you! We\'ve received your inquiry and will be in touch shortly.');
      setIsSubmitted(true);
      setIsLoading(false);
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCtaClick = (option: typeof ctaOptions[0]) => {
    setFormData({
      ...formData,
      inquiryType: option.title
    });
    toast.info(`Selected: ${option.title}. Please fill out the form below.`);
    // Smooth scroll to form
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${contactHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in">
            Let's Build a <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Global Partnership</span>
          </h1>
          <p className="text-xl lg:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Whether you're sourcing premium products, exploring a venture, or investing in logistics, you're in the right place. Reach out—let's grow together.
          </p>
        </div>
      </section>

      {/* CTA Carousel Section */}
      <section className="py-16 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How Can We Help You?</h2>
            <p className="text-muted-foreground text-lg">Choose your path to partnership</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              {ctaOptions.map((option, index) => (
                <div
                  key={option.title}
                  className={`${
                    index === currentCarouselIndex ? 'block' : 'hidden'
                  } relative p-12 text-center transition-all duration-500`}
                  style={{
                    background: `linear-gradient(135deg, ${option.bgGradient.replace('from-', '').replace('to-', '').replace('/', ', ')})`,
                  }}
                >
                  <div className="relative z-10">
                    <div className={`w-20 h-20 bg-gradient-to-br ${option.gradient} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                      <option.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">{option.title}</h3>
                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                      {option.description}
                    </p>
                    <Button 
                      onClick={() => handleCtaClick(option)}
                      size="lg"
                      className={`bg-gradient-to-r ${option.gradient} hover:opacity-90 text-white px-8 py-4 text-lg font-semibold`}
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Navigation */}
            <div className="flex justify-center mt-8 space-x-3">
              {ctaOptions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCarouselIndex(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentCarouselIndex
                      ? 'bg-primary scale-125 shadow-lg'
                      : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Let's start the conversation.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We'll get back to you within 1 business day. Your message helps us tailor the perfect response.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="card-elevated">
              <CardContent className="p-8">
                {isSubmitted ? (
                  <div className="text-center py-12 space-y-6">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-green-600">✅ Thank you!</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      We've received your inquiry and will be in touch shortly.<br />
                      Meanwhile, you can explore our <Link to="/ventures" className="text-primary font-medium hover:underline">Ventures Portfolio</Link> or <Link to="/about" className="text-primary font-medium hover:underline">Sustainability Commitments</Link>.
                    </p>
                  </div>
                ) : (
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inquiryType">Inquiry Type</Label>
                      <Select value={formData.inquiryType} onValueChange={(value) => handleSelectChange('inquiryType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select inquiry type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buyer">Buyer</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Investor">Investor</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={6}
                        placeholder="Tell us about your inquiry..."
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      <Send className="h-5 w-5 mr-2" />
                      {isLoading ? 'Submitting...' : 'Send My Message'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-8">
              {/* Contact Information */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">info@trustlinkventures.com</p>
                      <p className="text-sm text-muted-foreground">General inquiries</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Trust Link Ventures Limited</p>
                      <div className="text-sm text-muted-foreground">
                        <div>P. O. Box 709</div>
                        <div>Adabraka, Accra, Ghana</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Quote className="w-5 h-5" />
                    What Our Partners Say
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="space-y-3">
                      <p className="text-sm italic leading-relaxed">"{testimonial.text}"</p>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">— {testimonial.author}</span>
                        <span className="block">{testimonial.role}</span>
                      </div>
                      {index < testimonials.length - 1 && <hr className="border-border" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-accent/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Certifications */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-8">Trusted & Certified</h3>
            <div className="flex justify-center flex-wrap gap-6">
              {certifications.map((cert, index) => (
                <Badge key={index} variant="outline" className="px-4 py-2 text-sm">
                  <cert.icon className="w-4 h-4 mr-2" />
                  {cert.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {miniStats.map((stat, index) => (
              <Card key={index} className="text-center p-6 card-elevated">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;