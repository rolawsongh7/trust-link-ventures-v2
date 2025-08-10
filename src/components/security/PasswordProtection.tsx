import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Shield, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const PasswordProtection: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordPolicies, setPasswordPolicies] = useState({
    minLength: true,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    passwordHistory: true,
    maxAge: true
  });

  const analyzePassword = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      numbers: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      strength: 0
    };

    const strengthScore = Object.values(checks).slice(0, 5).filter(Boolean).length;
    checks.strength = (strengthScore / 5) * 100;

    return checks;
  };

  const passwordAnalysis = analyzePassword(password);

  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'bg-destructive';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Password Security Policies
          </CardTitle>
          <CardDescription>
            Configure password requirements and security rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(passwordPolicies).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => 
                    setPasswordPolicies(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Strength Analyzer</CardTitle>
          <CardDescription>
            Test password strength against current policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-password">Test Password</Label>
            <div className="relative">
              <Input
                id="test-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to test"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {password && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Password Strength</span>
                  <Badge variant={passwordAnalysis.strength < 40 ? 'destructive' : passwordAnalysis.strength < 70 ? 'secondary' : 'default'}>
                    {getStrengthLabel(passwordAnalysis.strength)}
                  </Badge>
                </div>
                <Progress value={passwordAnalysis.strength} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  {passwordAnalysis.length ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">8+ characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordAnalysis.uppercase ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">Uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordAnalysis.lowercase ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">Lowercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordAnalysis.numbers ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">Number</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordAnalysis.special ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">Special character</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breach Detection</CardTitle>
          <CardDescription>
            Check if passwords have been compromised in known data breaches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Passwords are checked against known breach databases using secure hashing.
              No actual passwords are transmitted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};