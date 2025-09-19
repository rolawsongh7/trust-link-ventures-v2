import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface Partner {
  name: string;
  location: string;
  description: string;
  specialties: string[];
  established: string;
  website?: string;
  reach?: string;
  logo: string;
}

interface PartnerCardProps {
  partner: Partner;
  index: number;
}

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

const PartnerCard: React.FC<PartnerCardProps> = ({ partner, index }) => {
  const { elementRef, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true
  });

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`transform transition-all duration-700 ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group hover:border-primary/30 touch-manipulation">
        <CardHeader className="pb-3 p-4 md:p-6">
          {/* Partner Logo */}
          <div className="flex items-center justify-center mb-4 h-12 sm:h-16 overflow-hidden">
            <img 
              src={partner.logo}
              alt={`${partner.name} logo`}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 line-clamp-2">
              <span className="text-xl sm:text-2xl flex-shrink-0" role="img" aria-label={`${partner.location} flag`}>
                {getCountryFlag(partner.location)}
              </span>
              <span className="min-w-0">{partner.name}</span>
            </CardTitle>
            <Badge variant="outline" className="flex items-center space-x-1 w-fit">
              <span className="text-xs">{partner.location}</span>
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm line-clamp-3 leading-relaxed">
            {partner.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0 p-4 md:p-6">
          <div>
            <h4 className="font-semibold text-xs sm:text-sm mb-2">Specialties</h4>
            <div className="flex flex-wrap gap-1">
              {partner.specialties.map((specialty, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs px-2 py-1">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Est. {partner.established}</span>
            {partner.reach && (
              <span className="text-primary font-medium">{partner.reach}</span>
            )}
          </div>
          
          {partner.website && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="w-full h-10 sm:h-11 group-hover:border-primary group-hover:text-primary transition-colors touch-manipulation"
            >
              <a href={partner.website} target="_blank" rel="noopener noreferrer">
                <span className="text-xs sm:text-sm">Visit Website</span>
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerCard;