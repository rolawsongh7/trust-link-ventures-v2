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
      <Card className="h-full hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
        <CardHeader className="pb-4">
          {/* Partner Logo */}
          <div className="flex items-center justify-center mb-4 h-16 overflow-hidden">
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
          
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label={`${partner.location} flag`}>
                {getCountryFlag(partner.location)}
              </span>
              {partner.name}
            </CardTitle>
            <Badge variant="outline" className="flex items-center space-x-1">
              <span className="text-xs">{partner.location}</span>
            </Badge>
          </div>
          <CardDescription className="text-sm line-clamp-3">
            {partner.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0">
          <div>
            <h4 className="font-semibold text-sm mb-2">Specialties</h4>
            <div className="flex flex-wrap gap-1">
              {partner.specialties.map((specialty, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
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
              className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
            >
              <a href={partner.website} target="_blank" rel="noopener noreferrer">
                Visit Website <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerCard;