import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Quote, ShoppingCart, Handshake, TrendingUp, MessageCircle, ArrowRight, Smartphone, Apple, Download, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from 'sonner';
import contactHeroBg from '@/assets/contact-hero-bg.jpg';
import ContactForm from '@/components/contact/ContactForm';
import ContactFAQ from '@/components/contact/ContactFAQ';

const Contact = () => {
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [selectedInquiryType, setSelectedInquiryType] = useState('');

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


  const testimonials = [
    {
      text: "Trust Link Ventures made sourcing in West Africa seamless—from sourcing to final-mile delivery, we knew we had the right partner.",
      author: "Mariam B.",
      role: "Regional Buyer, Lagos",
      rating: 5
    },
    {
      text: "Their attention to temperature control and export compliance is unmatched. Highly recommended for any serious buyer.",
      author: "Kwame O.",
      role: "Logistics Director, Accra",
      rating: 5
    },
    {
      text: "Working with Trust Link has transformed our supply chain. Their reliability and quality standards are exceptional.",
      author: "Sarah M.",
      role: "Procurement Manager, Tema",
      rating: 5
    },
    {
      text: "The professionalism and efficiency of their logistics team is outstanding. They consistently deliver on time and in perfect condition.",
      author: "David K.",
      role: "Operations Director, Kumasi",
      rating: 5
    },
    {
      text: "Trust Link's comprehensive service from sourcing to delivery has made our operations much more efficient. Excellent partnership.",
      author: "Fatima A.",
      role: "Supply Chain Head, Takoradi",
      rating: 5
    }
  ];

  // Carousel auto-advance
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % ctaOptions.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ctaOptions.length]);


  const handleCtaClick = (option: typeof ctaOptions[0]) => {
    setSelectedInquiryType(option.title);
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

      {/* Elegant Section Divider */}
      <div className="py-16 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="max-w-4xl mx-auto text-center">
          <Separator className="mb-8" />
          <div className="w-20 h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full mx-auto" />
        </div>
      </div>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Let's start the conversation.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We'll get back to you within 1 business day. Your message helps us tailor the perfect response.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <ContactForm initialInquiryType={selectedInquiryType} />
          </div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="py-24 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Quote className="w-8 h-8 text-primary" />
              What Our Partners Say
            </h2>
            <p className="text-muted-foreground text-lg">
              Hear from businesses that trust us with their supply chain needs
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index}>
                    <Card className="card-elevated">
                      <CardContent className="p-8 text-center">
                        <div className="flex justify-center mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <blockquote className="text-lg italic leading-relaxed mb-6">
                          "{testimonial.text}"
                        </blockquote>
                        <div className="border-t pt-4">
                          <p className="font-semibold text-primary">{testimonial.author}</p>
                          <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Download Apps Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Download Our Apps</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Take Trust Link Ventures with you wherever you go. Manage orders, track shipments, and stay connected on the move.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* App Preview */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 text-white text-center">
                  <Smartphone className="w-24 h-24 mx-auto mb-6 opacity-90" />
                  <h3 className="text-2xl font-bold mb-4">Trust Link Mobile</h3>
                  <p className="text-blue-100 mb-6">
                    Order management, real-time tracking, and instant communication - all in your pocket.
                  </p>
                  <div className="flex justify-center space-x-4 text-sm">
                    <div className="bg-white/20 px-3 py-1 rounded-full">📱 iOS & Android</div>
                    <div className="bg-white/20 px-3 py-1 rounded-full">🔒 Secure</div>
                    <div className="bg-white/20 px-3 py-1 rounded-full">⚡ Fast</div>
                  </div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* App Store Button */}
                  <Button 
                    size="lg" 
                    className="w-full h-16 bg-black hover:bg-gray-800 text-white rounded-2xl flex items-center justify-start px-6 gap-4"
                  >
                    <Apple className="w-8 h-8" />
                    <div className="text-left">
                      <div className="text-xs text-gray-300">Download on the</div>
                      <div className="text-lg font-semibold">App Store</div>
                    </div>
                  </Button>

                  {/* Google Play Button */}
                  <Button 
                    size="lg" 
                    className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-start px-6 gap-4"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-green-100">Get it on</div>
                      <div className="text-lg font-semibold">Google Play</div>
                    </div>
                  </Button>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Join thousands of satisfied customers who manage their supply chain on the go
                  </p>
                  <div className="flex justify-center items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>4.8/5 Rating</span>
                    </div>
                    <div>50K+ Downloads</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg">
              Get instant answers to common questions about our services and processes.
            </p>
          </div>
          <ContactFAQ />
        </div>
      </section>

    </div>
  );
};

export default Contact;