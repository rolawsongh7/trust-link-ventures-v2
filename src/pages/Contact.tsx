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
import { useMobileDetection } from '@/hooks/useMobileDetection';

const Contact = () => {
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [selectedInquiryType, setSelectedInquiryType] = useState('');
  const { isMobile, isTablet, isTouchDevice } = useMobileDetection();

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
        className="relative min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${contactHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: isMobile ? 'scroll' : 'fixed'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight animate-fade-in">
            Let's Build a <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Global Partnership</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-6 md:mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Whether you're sourcing premium products, exploring a venture, or investing in logistics, you're in the right place. Reach out—let's grow together.
          </p>
        </div>
      </section>

      {/* CTA Carousel Section */}
      <section className="py-8 sm:py-12 md:py-16 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">How Can We Help You?</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Choose your path to partnership</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl">
              {ctaOptions.map((option, index) => (
                <div
                  key={option.title}
                  className={`${
                    index === currentCarouselIndex ? 'block' : 'hidden'
                  } relative p-6 sm:p-8 md:p-12 text-center transition-all duration-500`}
                  style={{
                    background: `linear-gradient(135deg, ${option.bgGradient.replace('from-', '').replace('to-', '').replace('/', ', ')})`,
                  }}
                >
                  <div className="relative z-10">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${option.gradient} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg`}>
                      <option.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">{option.title}</h3>
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                      {option.description}
                    </p>
                    <Button 
                      onClick={() => handleCtaClick(option)}
                      size={isMobile ? "default" : "lg"}
                      className={`bg-gradient-to-r ${option.gradient} hover:opacity-90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold min-h-[44px] touch-manipulation`}
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Navigation */}
            <div className="flex justify-center mt-6 sm:mt-8 space-x-2 sm:space-x-3">
              {ctaOptions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCarouselIndex(index)}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation transition-all duration-300 ${
                    index === currentCarouselIndex
                      ? 'scale-110'
                      : ''
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${
                    index === currentCarouselIndex
                      ? 'bg-primary scale-125 shadow-lg'
                      : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`} />
                </button>
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
      <section id="contact-form" className="py-12 sm:py-16 md:py-24 bg-background scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Let's start the conversation.</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              We'll get back to you within 1 business day. Your message helps us tailor the perfect response.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <ContactForm initialInquiryType={selectedInquiryType} />
          </div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
              <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              What Our Partners Say
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
              Hear from businesses that trust us with their supply chain needs
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Carousel className="w-full">
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index}>
                    <Card className="card-elevated">
                      <CardContent className="p-6 sm:p-8 text-center">
                        <div className="flex justify-center mb-3 sm:mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <blockquote className="text-sm sm:text-base md:text-lg italic leading-relaxed mb-4 sm:mb-6">
                          "{testimonial.text}"
                        </blockquote>
                        <div className="border-t pt-3 sm:pt-4">
                          <p className="font-semibold text-primary text-sm sm:text-base">{testimonial.author}</p>
                          <p className="text-muted-foreground text-xs sm:text-sm">{testimonial.role}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {!isMobile && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          </div>
        </div>
      </section>

      {/* Download Apps Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Download Our Apps</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              Take Trust Link Ventures with you wherever you go. Manage orders, track shipments, and stay connected on the move.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
              {/* App Preview */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white text-center">
                  <Smartphone className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 opacity-90" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Trust Link Mobile</h3>
                  <p className="text-blue-100 text-sm sm:text-base mb-4 sm:mb-6">
                    Order management, real-time tracking, and instant communication - all in your pocket.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-full">📱 iOS & Android</div>
                    <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-full">🔒 Secure</div>
                    <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-full">⚡ Fast</div>
                  </div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-3 sm:space-y-4">
                  {/* App Store Button */}
                  <Button 
                    size={isMobile ? "default" : "lg"}
                    className="w-full min-h-[56px] sm:h-16 bg-black hover:bg-gray-800 text-white rounded-xl sm:rounded-2xl flex items-center justify-start px-4 sm:px-6 gap-3 sm:gap-4 touch-manipulation"
                  >
                    <Apple className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs text-gray-300">Download on the</div>
                      <div className="text-base sm:text-lg font-semibold">App Store</div>
                    </div>
                  </Button>

                  {/* Google Play Button */}
                  <Button 
                    size={isMobile ? "default" : "lg"}
                    className="w-full min-h-[56px] sm:h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl sm:rounded-2xl flex items-center justify-start px-4 sm:px-6 gap-3 sm:gap-4 touch-manipulation"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-green-100">Get it on</div>
                      <div className="text-base sm:text-lg font-semibold">Google Play</div>
                    </div>
                  </Button>
                </div>

                <div className="text-center pt-2 sm:pt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
                    Join thousands of satisfied customers who manage their supply chain on the go
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
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
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-accent/5 to-secondary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
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