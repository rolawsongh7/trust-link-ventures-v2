import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { validatePassword, PasswordPolicy, DEFAULT_PASSWORD_POLICY } from '@/lib/security';

interface PasswordStrengthIndicatorProps {
  password: string;
  policy?: PasswordPolicy;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  policy = DEFAULT_PASSWORD_POLICY,
  className = ''
}) => {
  const validation = validatePassword(password, policy);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'strong': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getProgressValue = (strength: string) => {
    switch (strength) {
      case 'weak': return 25;
      case 'medium': return 60;
      case 'strong': return 100;
      default: return 0;
    }
  };

  const requirements = [
    {
      label: `At least ${policy.minLength} characters`,
      met: password.length >= policy.minLength
    },
    {
      label: 'Uppercase letter',
      met: policy.requireUppercase ? /[A-Z]/.test(password) : true
    },
    {
      label: 'Lowercase letter',
      met: policy.requireLowercase ? /[a-z]/.test(password) : true
    },
    {
      label: 'Number',
      met: policy.requireNumbers ? /\d/.test(password) : true
    },
    {
      label: 'Special character',
      met: policy.requireSpecialChars ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password) : true
    }
  ];

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password Strength</span>
          <Badge 
            variant="outline" 
            className={getStrengthColor(validation.strength)}
          >
            {validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)}
          </Badge>
        </div>
        <Progress 
          value={getProgressValue(validation.strength)} 
          className="w-full h-2"
        />
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium">Requirements:</span>
        <div className="grid grid-cols-1 gap-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              {req.met ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="space-y-1">
          <span className="text-sm font-medium text-destructive">Issues:</span>
          <ul className="text-sm text-destructive space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};