import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Award, Globe } from 'lucide-react';

const PartnerLogos = () => {
  const certifications = [
    { name: 'HACCP Certified', icon: Shield, color: 'bg-green-500' },
    { name: 'Halal Compliance', icon: Award, color: 'bg-blue-500' },
    { name: 'ISO 22000 Food Safety', icon: Globe, color: 'bg-purple-500' }
  ];

  const stats = [
    { label: 'Tons Delivered', value: '1,200+', icon: '📦' },
    { label: 'Global Markets', value: '10+', icon: '🌍' },
    { label: 'Partner Retention Rate', value: '98%', icon: '🤝' }
  ];

  return (
    <div className="space-y-6">
      {/* Certifications */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Certifications & Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-accent/20 border border-accent/30">
                <div className={`w-8 h-8 rounded-full ${cert.color} flex items-center justify-center`}>
                  <cert.icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-sm">{cert.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mini Stats */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Our Track Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLogos;