import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, User } from "lucide-react";

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  defaultName?: string;
  sourceType: 'quote_request' | 'lead' | 'customer' | 'manual';
  sourceId?: string;
  onSuccess?: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  defaultEmail,
  defaultName,
  sourceType,
  sourceId,
  onSuccess,
}: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: defaultEmail || "",
      name: defaultName || "",
      message: "",
    },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: values.email,
          name: values.name,
          sourceType,
          sourceId,
          metadata: {
            custom_message: values.message,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Invitation sent to ${values.email}`, {
        description: "They will receive an email with instructions to set up their account.",
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User to Portal</DialogTitle>
          <DialogDescription>
            Send an invitation email to grant portal access. They'll be able to view quotes, orders, and track deliveries.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="user@example.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The email address where the invitation will be sent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="John Doe"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Their name for personalization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to the invitation email..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
