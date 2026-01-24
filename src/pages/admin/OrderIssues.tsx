import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Search, 
  Eye, 
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  MessageSquare,
  Image as ImageIcon,
  ExternalLink,
  ArrowRight,
  Send,
  User,
  Camera
} from 'lucide-react';
import { ProofOfDeliverySection } from '@/components/customer/ProofOfDeliverySection';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MobileIssueCard } from '@/components/admin/MobileIssueCard';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface OrderIssue {
  id: string;
  order_id: string;
  customer_id: string;
  issue_type: string;
  description: string;
  photos: string[];
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  source?: string | null;
  affected_items?: any;
  orders?: {
    order_number: string;
    status: string;
    delivered_at: string | null;
    shipped_at: string | null;
    proof_of_delivery_url: string | null;
    delivery_proof_url: string | null;
    delivery_signature: string | null;
    delivered_by: string | null;
    customers?: {
      company_name: string;
      contact_name: string;
      email: string;
    };
  };
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

const OrderIssues = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useMobileDetection();
  const [issues, setIssues] = useState<OrderIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<OrderIssue | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [issueMessages, setIssueMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  const showMobileCards = isMobile || isTablet;

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_issues')
        .select(`
          *,
          orders!inner(
            order_number,
            status,
            delivered_at,
            shipped_at,
            proof_of_delivery_url,
            delivery_proof_url,
            delivery_signature,
            delivered_by,
            customers(
              company_name,
              contact_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (err: any) {
      console.error('Error fetching issues:', err);
      toast({
        title: "Error",
        description: "Failed to load order issues",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedIssue || !newStatus) return;

    try {
      setIsUpdating(true);
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes || selectedIssue.admin_notes,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        updateData.resolved_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('order_issues')
        .update(updateData)
        .eq('id', selectedIssue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Issue status updated to ${statusLabels[newStatus]}`
      });

      setIsDetailOpen(false);
      setSelectedIssue(null);
      setNewStatus('');
      setAdminNotes('');
      fetchIssues();
    } catch (err: any) {
      console.error('Error updating issue:', err);
      toast({
        title: "Error",
        description: "Failed to update issue status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchIssueMessages = async (issueId: string) => {
    try {
      const { data, error } = await supabase
        .from('communications')
        .select('id, content, direction, communication_date, contact_person, created_by')
        .eq('issue_id', issueId)
        .order('communication_date', { ascending: true });

      if (error) throw error;
      setIssueMessages(data || []);
    } catch (err) {
      console.error('Error fetching issue messages:', err);
    }
  };

  const handleSendAdminReply = async () => {
    if (!selectedIssue || !replyContent.trim()) return;

    setSendingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('communications')
        .insert({
          customer_id: selectedIssue.customer_id,
          issue_id: selectedIssue.id,
          subject: `Re: Order Issue - ${selectedIssue.orders?.order_number}`,
          content: replyContent.trim(),
          direction: 'inbound', // Admin → Customer
          communication_type: 'email',
          contact_person: 'Support Team',
          created_by: user?.id
        });

      if (error) throw error;

      setReplyContent('');
      fetchIssueMessages(selectedIssue.id);

      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the customer."
      });
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
    } finally {
      setSendingReply(false);
    }
  };

  const openIssueDetail = (issue: OrderIssue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setAdminNotes(issue.admin_notes || '');
    setReplyContent('');
    setIssueMessages([]);
    setIsDetailOpen(true);
    fetchIssueMessages(issue.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><MessageSquare className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
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

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.orders?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || issue.status === activeTab;
    const matchesSource = sourceFilter === 'all' || issue.source === sourceFilter;
    
    return matchesSearch && matchesTab && matchesSource;
  });

  const getTabCount = (status: string) => {
    if (status === 'all') return issues.length;
    return issues.filter(i => i.status === status).length;
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'customer_portal':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Customer Portal</Badge>;
      case 'internal':
        return <Badge className="bg-gray-100 text-gray-800 text-xs">Internal</Badge>;
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 text-xs">Admin</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{source || 'Unknown'}</Badge>;
    }
  };

  const renderIssueRow = (issue: OrderIssue) => (
    <TableRow key={issue.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openIssueDetail(issue)}>
      <TableCell className="font-medium">{issue.orders?.order_number}</TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{issue.orders?.customers?.company_name}</div>
          <div className="text-xs text-muted-foreground">{issue.orders?.customers?.email}</div>
        </div>
      </TableCell>
      <TableCell>{getIssueTypeBadge(issue.issue_type)}</TableCell>
      <TableCell>{getStatusBadge(issue.status)}</TableCell>
      <TableCell>{getSourceBadge(issue.source)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(issue.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        {issue.photos?.length > 0 ? (
          <Badge variant="outline" className="text-xs">
            <ImageIcon className="h-3 w-3 mr-1" />
            {issue.photos.length}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">None</span>
        )}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openIssueDetail(issue); }}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
          Order Issues
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage customer-reported order issues and delivery problems
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{issues.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{getTabCount('submitted')}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold text-yellow-600">{getTabCount('reviewing')}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{getTabCount('resolved')}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order, customer, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="customer_portal">Customer Portal</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({getTabCount('all')})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({getTabCount('submitted')})</TabsTrigger>
              <TabsTrigger value="reviewing">Reviewing ({getTabCount('reviewing')})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({getTabCount('resolved')})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({getTabCount('rejected')})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'No order issues have been reported yet'}
              </p>
            </div>
          ) : showMobileCards ? (
            /* Mobile Card View */
            <div className="grid grid-cols-1 gap-3">
              {filteredIssues.map((issue) => (
                <MobileIssueCard 
                  key={issue.id} 
                  issue={issue} 
                  onViewDetails={openIssueDetail}
                />
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 lg:hidden" />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 lg:hidden" />
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map(renderIssueRow)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Issue Details
            </DialogTitle>
            <DialogDescription>
              Order #{selectedIssue?.orders?.order_number}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-6">
              {/* Issue Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Type</p>
                  {getIssueTypeBadge(selectedIssue.issue_type)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  {getStatusBadge(selectedIssue.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedIssue.orders?.customers?.company_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedIssue.orders?.customers?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported On</p>
                  <p className="font-medium">{format(new Date(selectedIssue.created_at), 'PPpp')}</p>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-3">
                {/* Related Order */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Related Order</p>
                      <p className="text-lg font-bold">#{selectedIssue.orders?.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {selectedIssue.orders?.status?.replace(/_/g, ' ')}
                        {selectedIssue.orders?.delivered_at && (
                          <> • Delivered: {format(new Date(selectedIssue.orders.delivered_at), 'PPp')}</>
                        )}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        setIsDetailOpen(false);
                        navigate('/admin/orders', { 
                          state: { highlightOrderId: selectedIssue.order_id } 
                        });
                      }}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      View Order
                    </Button>
                  </div>
                </div>

                {/* Related Customer */}
                <div className="bg-muted/50 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="font-medium">{selectedIssue.orders?.customers?.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedIssue.orders?.customers?.email}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        setIsDetailOpen(false);
                        navigate('/admin/customers', { 
                          state: { viewCustomerId: selectedIssue.customer_id } 
                        });
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Customer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{selectedIssue.description}</p>
                </div>
              </div>

              {/* Photos */}
              {selectedIssue.photos && selectedIssue.photos.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Attached Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedIssue.photos.map((photo, index) => (
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

              {/* Proof of Delivery for Dispute Resolution */}
              {(selectedIssue.orders?.proof_of_delivery_url || 
                selectedIssue.orders?.delivery_proof_url || 
                selectedIssue.orders?.delivery_signature) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Proof of Delivery (For Dispute Resolution)
                  </p>
                  <ProofOfDeliverySection
                    deliveryProofUrl={selectedIssue.orders?.delivery_proof_url}
                    proofOfDeliveryUrl={selectedIssue.orders?.proof_of_delivery_url}
                    deliverySignature={selectedIssue.orders?.delivery_signature}
                    deliveredAt={selectedIssue.orders?.delivered_at}
                    compact
                  />
                </div>
              )}

              {/* Message Thread */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages ({issueMessages.length})
                </p>
                <ScrollArea className="h-[200px] border rounded-lg p-3 mb-3">
                  {issueMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                  ) : (
                    issueMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`mb-3 p-2 rounded ${msg.direction === 'inbound' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {msg.direction === 'inbound' ? 'Support Team' : 'Customer'} • {format(new Date(msg.communication_date), 'PPp')}
                        </p>
                      </div>
                    ))
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Reply to customer..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendAdminReply} 
                    disabled={!replyContent.trim() || sendingReply}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Update Status</p>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="reviewing">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Admin Notes</p>
                  <Textarea
                    placeholder="Add internal notes about this issue..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {selectedIssue.resolved_at && (
                  <div className="text-sm text-muted-foreground">
                    Resolved on {format(new Date(selectedIssue.resolved_at), 'PPpp')}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderIssues;
