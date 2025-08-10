import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Activity, AlertTriangle, TrendingUp, Clock, MapPin, Shield } from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const [detectionSettings, setDetectionSettings] = useState({
    loginPatterns: true,
    locationAnomaly: true,
    deviceAnomaly: true,
    timeAnomaly: true,
    volumeAnomaly: true,
    behaviorAnomaly: true
  });

  const [thresholds, setThresholds] = useState({
    suspiciousLogins: '5',
    unusualLocation: '500', // miles
    offHoursAccess: '22', // hour
    dataVolume: '100' // MB
  });

  const anomalies = [
    {
      id: '1',
      type: 'location',
      severity: 'high',
      description: 'Login from unusual location: Moscow, Russia',
      timestamp: '2024-01-15T03:22:00Z',
      user: 'john.doe@company.com',
      resolved: false
    },
    {
      id: '2',
      type: 'time',
      severity: 'medium',
      description: 'Off-hours access at 2:30 AM',
      timestamp: '2024-01-15T02:30:00Z',
      user: 'jane.smith@company.com',
      resolved: true
    },
    {
      id: '3',
      type: 'behavior',
      severity: 'low',
      description: 'Unusual data access pattern detected',
      timestamp: '2024-01-14T14:15:00Z',
      user: 'mike.jones@company.com',
      resolved: false
    },
    {
      id: '4',
      type: 'device',
      severity: 'high',
      description: 'Login from unrecognized device',
      timestamp: '2024-01-14T11:45:00Z',
      user: 'sarah.wilson@company.com',
      resolved: false
    }
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'time':
        return <Clock className="h-4 w-4" />;
      case 'device':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const resolveAnomaly = (id: string) => {
    // In a real app, this would update the anomaly status
    console.log('Resolving anomaly:', id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Anomaly Detection Settings
          </CardTitle>
          <CardDescription>
            Configure automatic detection of unusual user behavior and security threats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(detectionSettings).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => 
                    setDetectionSettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection Thresholds</CardTitle>
          <CardDescription>
            Configure sensitivity levels for anomaly detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="suspicious-logins">Failed Login Attempts</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="suspicious-logins"
                  type="number"
                  value={thresholds.suspiciousLogins}
                  onChange={(e) => setThresholds(prev => ({ ...prev, suspiciousLogins: e.target.value }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">attempts</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unusual-location">Location Distance</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="unusual-location"
                  type="number"
                  value={thresholds.unusualLocation}
                  onChange={(e) => setThresholds(prev => ({ ...prev, unusualLocation: e.target.value }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">miles</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="off-hours">Off-Hours Threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="off-hours"
                  type="number"
                  value={thresholds.offHoursAccess}
                  onChange={(e) => setThresholds(prev => ({ ...prev, offHoursAccess: e.target.value }))}
                  className="w-20"
                  min="0"
                  max="23"
                />
                <span className="text-sm text-muted-foreground">:00 (24h format)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-volume">Data Volume Threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="data-volume"
                  type="number"
                  value={thresholds.dataVolume}
                  onChange={(e) => setThresholds(prev => ({ ...prev, dataVolume: e.target.value }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Security Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-500">3</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">5</div>
              <div className="text-sm text-muted-foreground">Medium Risk</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-500">12</div>
              <div className="text-sm text-muted-foreground">Low Risk</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-500">45</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Anomalies
          </CardTitle>
          <CardDescription>
            Security anomalies detected in the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getAnomalyIcon(anomaly.type)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(anomaly.severity)}
                    <span className="font-medium">{anomaly.description}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    User: {anomaly.user} • {new Date(anomaly.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!anomaly.resolved ? (
                  <>
                    <Button variant="outline" size="sm">
                      Investigate
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => resolveAnomaly(anomaly.id)}
                    >
                      Resolve
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-green-600">
                    Resolved
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Machine Learning Models</CardTitle>
          <CardDescription>
            AI-powered anomaly detection model performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Login Behavior</span>
                <Badge className="bg-green-500">Active</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Accuracy: 94.2% • Last trained: 2 days ago
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Data Access</span>
                <Badge className="bg-green-500">Active</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Accuracy: 89.7% • Last trained: 1 week ago
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Network Traffic</span>
                <Badge variant="secondary">Training</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Progress: 67% • ETA: 3 hours
              </div>
            </div>
          </div>

          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Model retraining scheduled for tonight. Enhanced detection capabilities will be available tomorrow.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};