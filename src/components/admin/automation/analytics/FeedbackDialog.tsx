/**
 * Phase 4.4: Feedback Dialog
 * Modal for submitting feedback on automation executions
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ThumbsUp, Minus, ThumbsDown, Loader2 } from 'lucide-react';
import { useSubmitFeedback } from '@/hooks/useAutomationAnalytics';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
  executionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  executionId,
  open,
  onOpenChange,
}) => {
  const [feedbackType, setFeedbackType] = useState<'helpful' | 'neutral' | 'harmful'>('helpful');
  const [notes, setNotes] = useState('');
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async () => {
    if (!executionId) return;

    await submitFeedback.mutateAsync({
      executionId,
      feedbackType,
      notes: notes.trim() || undefined,
    });

    // Reset and close
    setFeedbackType('helpful');
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setFeedbackType('helpful');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate This Automation</DialogTitle>
          <DialogDescription>
            Your feedback helps improve automation quality and identify issues early.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label>How was this automation?</Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as 'helpful' | 'neutral' | 'harmful')}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="helpful"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  feedbackType === 'helpful'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <RadioGroupItem value="helpful" id="helpful" className="sr-only" />
                <ThumbsUp className={cn(
                  'h-6 w-6',
                  feedbackType === 'helpful' ? 'text-green-600' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  feedbackType === 'helpful' ? 'text-green-600' : 'text-muted-foreground'
                )}>
                  Helpful
                </span>
              </Label>

              <Label
                htmlFor="neutral"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  feedbackType === 'neutral'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <RadioGroupItem value="neutral" id="neutral" className="sr-only" />
                <Minus className={cn(
                  'h-6 w-6',
                  feedbackType === 'neutral' ? 'text-yellow-600' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  feedbackType === 'neutral' ? 'text-yellow-600' : 'text-muted-foreground'
                )}>
                  Neutral
                </span>
              </Label>

              <Label
                htmlFor="harmful"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  feedbackType === 'harmful'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <RadioGroupItem value="harmful" id="harmful" className="sr-only" />
                <ThumbsDown className={cn(
                  'h-6 w-6',
                  feedbackType === 'harmful' ? 'text-red-600' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  feedbackType === 'harmful' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  Harmful
                </span>
              </Label>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder={
                feedbackType === 'harmful'
                  ? 'Please describe what went wrong...'
                  : 'Any additional context...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitFeedback.isPending}
          >
            {submitFeedback.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
