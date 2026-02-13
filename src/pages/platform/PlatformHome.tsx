import { Button } from '@/components/ui/button';
import { Building2, ShieldCheck, Globe, BarChart3 } from 'lucide-react';

const features = [
  { icon: Building2, title: 'Multi-Tenant Management', description: 'Provision and manage tenant organizations with isolated data boundaries.' },
  { icon: ShieldCheck, title: 'Enterprise Security', description: 'Role-based access, audit logging, and data isolation out of the box.' },
  { icon: Globe, title: 'Custom Domains', description: 'Each tenant gets their own branded domain for public and admin portals.' },
  { icon: BarChart3, title: 'Analytics & Insights', description: 'Platform-wide analytics across all tenants and operations.' },
];

export default function PlatformHome() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg">Hesed</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/platform/login">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          The Platform for <span className="text-primary">B2B Commerce</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Hesed powers multi-tenant B2B operations — from quote management and invoicing 
          to logistics tracking and customer portals. All under one roof.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">Contact Sales</Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-6 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hesed Digital Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
