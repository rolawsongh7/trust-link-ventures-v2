import { Link } from 'react-router-dom';

interface LegalLinksProps {
  className?: string;
  variant?: 'light' | 'dark' | 'muted';
}

export function LegalLinks({ className = '', variant = 'muted' }: LegalLinksProps) {
  const colorClasses = {
    light: 'text-white/80 hover:text-white',
    dark: 'text-foreground hover:text-foreground/80',
    muted: 'text-muted-foreground hover:text-foreground',
  };

  return (
    <div className={`text-center text-sm ${className}`}>
      <p className={colorClasses[variant]}>
        By continuing, you agree to our{' '}
        <Link to="/terms" className="underline underline-offset-2 font-medium">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="underline underline-offset-2 font-medium">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
