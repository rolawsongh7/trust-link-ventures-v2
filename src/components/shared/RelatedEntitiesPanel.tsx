import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, FileText, Receipt, AlertTriangle } from 'lucide-react';
import { RelatedEntityCard } from './RelatedEntityCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface RelatedCustomer {
  id: string;
  name: string;
  email?: string;
}

interface RelatedOrder {
  id: string;
  number: string;
  status?: string;
}

interface RelatedQuote {
  id: string;
  number: string;
  title?: string;
}

interface RelatedInvoice {
  id: string;
  number: string;
  type: string;
}

interface RelatedIssue {
  id: string;
  type: string;
  status: string;
}

interface RelatedEntitiesPanelProps {
  customer?: RelatedCustomer | null;
  order?: RelatedOrder | null;
  quote?: RelatedQuote | null;
  invoices?: RelatedInvoice[];
  issues?: RelatedIssue[];
  onCloseDialog?: () => void;
  showTitle?: boolean;
  variant?: 'compact' | 'panel';
}

export const RelatedEntitiesPanel: React.FC<RelatedEntitiesPanelProps> = ({
  customer,
  order,
  quote,
  invoices = [],
  issues = [],
  onCloseDialog,
  showTitle = true,
  variant = 'compact',
}) => {
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();

  const handleNavigate = (path: string, state?: any) => {
    onCloseDialog?.();
    navigate(path, { state });
  };

  const hasAnyRelated = customer || order || quote || invoices.length > 0 || issues.length > 0;

  if (!hasAnyRelated) return null;

  const content = (
    <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-2 gap-2"}>
      {customer && (
        <RelatedEntityCard
          title="Customer"
          value={customer.name}
          subValue={customer.email}
          icon={User}
          onView={() => handleNavigate('/admin/customers', { viewCustomerId: customer.id })}
          variant={variant}
        />
      )}
      
      {order && (
        <RelatedEntityCard
          title="Order"
          value={`#${order.number}`}
          subValue={order.status?.replace(/_/g, ' ')}
          icon={Package}
          onView={() => handleNavigate('/admin/orders', { highlightOrderId: order.id })}
          variant={variant}
        />
      )}
      
      {quote && (
        <RelatedEntityCard
          title="Quote"
          value={quote.number}
          subValue={quote.title}
          icon={FileText}
          onView={() => handleNavigate('/admin/quotes', { viewQuoteId: quote.id })}
          variant={variant}
        />
      )}
      
      {invoices.length > 0 && (
        <RelatedEntityCard
          title="Invoices"
          value={invoices.length === 1 ? invoices[0].number : `${invoices.length} invoices`}
          subValue={invoices.length === 1 ? invoices[0].type.replace('_', ' ') : undefined}
          icon={Receipt}
          onView={() => handleNavigate('/admin/invoices', { viewInvoiceId: invoices[0].id })}
          variant={variant}
        />
      )}
      
      {issues.length > 0 && (
        <RelatedEntityCard
          title="Issues"
          value={`${issues.length} issue${issues.length > 1 ? 's' : ''}`}
          subValue={issues[0].status}
          icon={AlertTriangle}
          onView={() => handleNavigate('/admin/order-issues', { viewIssueId: issues[0].id })}
          variant={variant}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Accordion type="single" collapsible className="border-t pt-4">
        <AccordionItem value="related" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Related Records
          </AccordionTrigger>
          <AccordionContent>
            {content}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      {showTitle && (
        <h4 className="font-medium mb-3 text-sm">Related Records</h4>
      )}
      {content}
    </div>
  );
};
