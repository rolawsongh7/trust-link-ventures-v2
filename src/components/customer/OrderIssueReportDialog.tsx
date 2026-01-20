import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Upload, X, CheckCircle2, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { NotificationService } from '@/services/notificationService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrderIssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
}

type IssueType = 'missing_items' | 'damaged_items' | 'wrong_items' | 'late_delivery' | 'quality_issue' | 'other';

const issueTypeOptions: { value: IssueType; label: string; description: string }[] = [
  { value: 'missing_items', label: 'Missing Items', description: 'Some items were not included in the delivery' },
  { value: 'damaged_items', label: 'Damaged Items', description: 'Items arrived damaged or broken' },
  { value: 'wrong_items', label: 'Wrong Items', description: 'Received different items than ordered' },
  { value: 'late_delivery', label: 'Late Delivery', description: 'Delivery arrived later than expected' },
  { value: 'quality_issue', label: 'Quality Issue', description: 'Items do not meet expected quality' },
  { value: 'other', label: 'Other', description: 'Other issues not listed above' }
];

export const OrderIssueReportDialog: React.FC<OrderIssueReportDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber
}) => {
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  const { isOnline } = useNetworkStatus();
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "You can upload a maximum of 5 photos",
        variant: "destructive"
      });
      return;
    }

    setUploadingPhotos(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: "Please upload only image files",
            variant: "destructive"
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Each photo must be less than 5MB",
            variant: "destructive"
          });
          continue;
        }

        const fileName = `${orderId}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('order-issues')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('order-issues')
          .getPublicUrl(data.path);

        newPhotos.push(publicUrl);
      }

      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Photo upload error:', err);
      toast({
        title: "Upload failed",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!issueType || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an issue type and provide a description",
        variant: "destructive"
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        title: "Description too short",
        description: "Please provide a more detailed description (at least 10 characters)",
        variant: "destructive"
      });
      return;
    }

    // Get customer_id from customer_users table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to report an issue",
        variant: "destructive"
      });
      return;
    }

    const { data: customerUser, error: customerError } = await supabase
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customerUser?.customer_id) {
      toast({
        title: "Error",
        description: "Unable to identify your customer account",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('order_issues')
        .insert({
          order_id: orderId,
          customer_id: customerUser.customer_id,
          issue_type: issueType,
          description: description.trim(),
          photos: photos,
          source: 'customer_portal'
        });

      if (error) throw error;

      // Notify admins about the new issue
      await NotificationService.notifyOrderIssueSubmitted(
        orderNumber,
        profile?.full_name || profile?.company_name || 'Customer',
        issueTypeOptions.find(o => o.value === issueType)?.label || issueType
      );

      setIsSuccess(true);
      toast({
        title: "Issue Reported",
        description: "We've received your report and will review it shortly"
      });

      // Reset form after a delay
      setTimeout(() => {
        setIsSuccess(false);
        setIssueType('');
        setDescription('');
        setPhotos([]);
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting issue:', err);
      toast({
        title: "Failed to submit",
        description: err.message || "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIssueType('');
      setDescription('');
      setPhotos([]);
      setIsSuccess(false);
      onOpenChange(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Issue Reported Successfully</h3>
            <p className="text-muted-foreground">
              We've received your report for Order #{orderNumber}. Our team will review it and get back to you soon.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report a Problem
          </DialogTitle>
          <DialogDescription>
            Report an issue with Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Offline Warning */}
          {!isOnline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You are offline. Submitting an issue requires an internet connection.
              </AlertDescription>
            </Alert>
          )}

          {/* Issue Type */}
          <div className="space-y-2">
            <Label htmlFor="issue-type">What type of issue are you experiencing?</Label>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
              <SelectTrigger id="issue-type">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Describe the issue</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue. Include specific items affected, quantities, or any other relevant information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500 characters
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Attach Photos (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload up to 5 photos to help us understand the issue better
            </p>
            
            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length < 5 && (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingPhotos}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {photos.length > 0 ? 'Add More Photos' : 'Upload Photos'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {!isOnline ? (
            <Button disabled className="pointer-events-none">
              <WifiOff className="mr-2 h-4 w-4" />
              Requires Internet
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !issueType || !description.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
