import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Send, 
  AlertTriangle, 
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Image as ImageIcon,
  ExternalLink,
  Camera
} from 'lucide-react';
import { ProofOfDeliverySection } from '@/components/customer/ProofOfDeliverySection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationService } from '@/services/notificationService';

interface OrderIssue {
  id: string;
  order_id: string;
  customer_id: string;
  issue_type: string;
  description: string;
  photos: string[];
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  orders?: {
    order_number: string;
    status: string;
    delivered_at: string | null;
    proof_of_delivery_url: string | null;
    delivery_proof_url: string | null;
    delivery_signature: string | null;
  };
}

interface IssueMessage {
  id: string;
  content: string;
  direction: string;
  communication_date: string;
  contact_person: string | null;
  created_by: string | null;
}

const issueTypeLabels: Record<string, string> = {
  'missing_items': 'Missing Items',
  'damaged_items': 'Damaged Items',
  'wrong_items': 'Wrong Items',
  'late_delivery': 'Late Delivery',
  'quality_issue': 'Quality Issue',
  'other': 'Other'
};

const statusLabels: Record<string, string> = {
  'submitted': 'Submitted',
  'reviewing': 'Under Review',
  'resolved': 'Resolved',
  'rejected': 'Rejected'
};

export default function CustomerIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  
  const [issue, setIssue] = useState<OrderIssue | null>(null);
  const [messages, setMessages] = useState<IssueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchIssue = useCallback(async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('order_issues')
        .select(`
          *,
          orders(order_number, status, delivered_at, proof_of_delivery_url, delivery_proof_url, delivery_signature)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setIssue(data);
    } catch (err) {
      console.error('Error fetching issue:', err);
      toast({
        title: "Error",
        description: "Failed to load issue details",
        variant: "destructive"
      });
    }
  }, [id, toast]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('communications')
        .select('id, content, direction, communication_date, contact_person, created_by')
        .eq('issue_id', id)
        .order('communication_date', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchIssue(), fetchMessages()]);
      setLoading(false);
    };
    loadData();
  }, [fetchIssue, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`issue-messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communications',
          filter: `issue_id=eq.${id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchMessages]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !issue || !profile) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('communications')
        .insert({
          customer_id: issue.customer_id,
          issue_id: issue.id,
          subject: `Re: Order Issue - ${issue.orders?.order_number}`,
          content: replyContent.trim(),
          direction: 'outbound',
          communication_type: 'email',
          contact_person: profile.full_name || 'Customer'
        });

      if (error) throw error;

      // Notify admins about customer reply
      const customerName = profile.full_name || profile.company_name || 'Customer';
      await NotificationService.notifyAdminCustomerReply(
        issue.orders?.order_number || '',
        customerName,
        issue.id
      ).catch(err => console.error('Notification error (non-blocking):', err));

      setReplyContent('');
      toast({
        title: "Reply sent",
        description: "Your message has been sent to our support team."
      });
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'reviewing':
        return <Badge className="bg-yellow-100 text-yellow-800"><MessageSquare className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIssueTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'missing_items': 'bg-red-100 text-red-800',
      'damaged_items': 'bg-orange-100 text-orange-800',
      'wrong_items': 'bg-purple-100 text-purple-800',
      'late_delivery': 'bg-yellow-100 text-yellow-800',
      'quality_issue': 'bg-pink-100 text-pink-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>{issueTypeLabels[type] || type}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Issue Not Found</h2>
        <p className="text-muted-foreground mb-4">The issue you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/portal/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>

      {/* Issue Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Issue Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Order #{issue.orders?.order_number}
              </p>
            </div>
            {getStatusBadge(issue.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Issue Type</p>
              {getIssueTypeBadge(issue.issue_type)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reported On</p>
              <p className="font-medium">{format(new Date(issue.created_at), 'PPp')}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Your Description</p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">{issue.description}</p>
            </div>
          </div>

          {/* Photos */}
          {issue.photos && issue.photos.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Attached Photos ({issue.photos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {issue.photos.map((photo, index) => (
                  <a 
                    key={index} 
                    href={photo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src={photo} 
                      alt={`Issue photo ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-6 w-6 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {issue.admin_notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Admin Notes</p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm">{issue.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Proof of Delivery if available */}
          {(issue.orders?.proof_of_delivery_url || 
            issue.orders?.delivery_proof_url || 
            issue.orders?.delivery_signature) && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Delivery Confirmation
              </p>
              <ProofOfDeliverySection
                deliveryProofUrl={issue.orders?.delivery_proof_url}
                proofOfDeliveryUrl={issue.orders?.proof_of_delivery_url}
                deliverySignature={issue.orders?.delivery_signature}
                deliveredAt={issue.orders?.delivered_at}
                compact
              />
            </div>
          )}

          {/* Quick link to order */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/portal/orders')}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              View Order #{issue.orders?.order_number}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[300px] pr-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Send a message below.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-4 ${message.direction === 'outbound' ? 'text-right' : 'text-left'}`}
                  >
                    <div 
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        message.direction === 'outbound' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className={`text-xs text-muted-foreground mt-1 ${message.direction === 'outbound' ? 'text-right' : 'text-left'}`}>
                      {message.direction === 'outbound' ? 'You' : message.contact_person || 'Support Team'} • {format(new Date(message.communication_date), 'PPp')}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Reply Composer */}
          {issue.status !== 'resolved' && issue.status !== 'rejected' && (
            <div className="pt-4 border-t space-y-2">
              <Textarea
                placeholder="Type your message..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendReply} 
                  disabled={!replyContent.trim() || sending}
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Closed issue notice */}
          {(issue.status === 'resolved' || issue.status === 'rejected') && (
            <div className="pt-4 border-t">
              <div className={`p-4 rounded-lg ${issue.status === 'resolved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="text-sm font-medium">
                  This issue has been {issue.status}. You can no longer send messages.
                </p>
                {issue.status === 'resolved' && (
                  <p className="text-xs mt-1">
                    If you have further concerns, please submit a new issue report.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}