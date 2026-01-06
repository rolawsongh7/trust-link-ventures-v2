import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Trash2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

const DELETION_REASONS = [
  { value: 'no_longer_using', label: 'No longer using the service' },
  { value: 'privacy_concerns', label: 'Privacy concerns' },
  { value: 'found_alternative', label: 'Found an alternative service' },
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'poor_experience', label: 'Poor experience' },
  { value: 'other', label: 'Other' },
];

export function DeleteAccountDialog({ open, onOpenChange, userEmail }: DeleteAccountDialogProps) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState<string>('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteAccount } = useCustomerAuth();
  const navigate = useNavigate();

  const resetDialog = () => {
    setStep(1);
    setReason('');
    setEmailConfirmation('');
    setIsDeleting(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    if (emailConfirmation.toLowerCase() !== userEmail.toLowerCase()) {
      toast.error('Email does not match');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await deleteAccount(reason || undefined);
      if (error) {
        toast.error('Failed to delete account', { description: error.message });
        setIsDeleting(false);
        return;
      }

      toast.success('Account deleted successfully', {
        description: 'Your account and data have been permanently deleted.',
      });
      handleClose();
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to delete account', { description: error.message });
      setIsDeleting(false);
    }
  };

  const isEmailMatch = emailConfirmation.toLowerCase() === userEmail.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Delete Your Account</DialogTitle>
                  <DialogDescription>
                    This action is permanent and cannot be undone
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h4 className="font-medium text-destructive mb-2">
                  The following data will be permanently deleted:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Your profile and account information</li>
                  <li>All saved delivery addresses</li>
                  <li>Notification preferences and history</li>
                  <li>Security settings and MFA configuration</li>
                  <li>Shopping cart items</li>
                  <li>Communication history</li>
                </ul>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2">
                  The following data will be anonymized (kept for business records):
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Order history (your name will be removed)</li>
                  <li>Quote requests (contact details removed)</li>
                  <li>Invoices (required for accounting purposes)</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Help us improve</DialogTitle>
              <DialogDescription>
                We're sorry to see you go. Would you mind telling us why?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="reason">Reason for leaving (optional)</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason" className="mt-2">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {DELETION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="destructive" onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Confirm Account Deletion</DialogTitle>
                  <DialogDescription>
                    Type your email address to confirm
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This action cannot be undone. Your account and all associated
                  data will be permanently deleted.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-confirm">
                  Type <span className="font-mono font-medium">{userEmail}</span> to confirm
                </Label>
                <Input
                  id="email-confirm"
                  type="email"
                  placeholder="Enter your email address"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  className={emailConfirmation && !isEmailMatch ? 'border-destructive' : ''}
                />
                {emailConfirmation && !isEmailMatch && (
                  <p className="text-sm text-destructive">Email does not match</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isDeleting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isEmailMatch || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
