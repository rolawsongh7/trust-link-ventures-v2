/**
 * Utility to parse database constraint errors into actionable user-friendly messages
 * Part of Phase 1.5: Money Flows & Ops Stabilization
 */

export interface ParsedError {
  title: string;
  description: string;
  action?: 'verify-payment' | 'request-balance' | 'request-address' | 'view-order';
  actionLabel?: string;
}

/**
 * Parse order status transition errors from the database into user-friendly messages
 * with actionable next steps.
 */
export const parseStatusTransitionError = (error: any): ParsedError => {
  const message = error?.message || error?.details || '';
  
  // Payment verification required before processing
  if (message.includes('Cannot start processing without verified payment') || 
      message.includes('payment must be verified') ||
      message.includes('verified deposit')) {
    return {
      title: 'Payment Required',
      description: 'This order needs a verified deposit before processing can begin.',
      action: 'verify-payment',
      actionLabel: 'Verify Payment',
    };
  }
  
  // Full payment required before shipping
  if (message.includes('Cannot ship until fully paid') || 
      message.includes('fully paid') ||
      message.includes('balance remaining')) {
    // Try to extract balance amount from the error message
    const balanceMatch = message.match(/Balance:?\s*([\d,.\s]+)/i);
    const balance = balanceMatch ? balanceMatch[1].trim() : 'outstanding';
    return {
      title: 'Balance Payment Required',
      description: `Cannot proceed to shipping. Outstanding balance: ${balance}`,
      action: 'request-balance',
      actionLabel: 'Request Balance Payment',
    };
  }
  
  // Delivery address required before shipping
  if (message.includes('Cannot ship without delivery address') ||
      message.includes('delivery address') ||
      message.includes('confirmed delivery address')) {
    return {
      title: 'Address Required',
      description: 'Customer must provide a delivery address before shipping.',
      action: 'request-address',
      actionLabel: 'Request Address',
    };
  }

  // Invalid status transition
  if (message.includes('Invalid order status transition') ||
      message.includes('status transition')) {
    return {
      title: 'Invalid Status Change',
      description: 'This status transition is not allowed. Please check order requirements.',
      action: 'view-order',
      actionLabel: 'View Order Details',
    };
  }

  // Tracking details required for shipping
  if (message.includes('tracking') || message.includes('carrier')) {
    return {
      title: 'Tracking Details Required',
      description: 'Please provide carrier and tracking information before marking as shipped.',
    };
  }
  
  // Default fallback
  return {
    title: 'Status Update Failed',
    description: message || 'Please check order requirements and try again.',
  };
};

/**
 * Get the reason why an order is blocked from a specific action
 */
export const getBlockerReason = (order: {
  status: string;
  payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid' | null;
  balance_remaining?: number | null;
  delivery_address_id?: string | null;
  currency?: string;
}): string | null => {
  const { status, payment_status, balance_remaining, delivery_address_id, currency = 'GHS' } = order;
  
  // Processing with partial payment - waiting for balance
  if (status === 'processing' && payment_status === 'partially_paid') {
    const balance = balance_remaining ?? 0;
    return `Waiting for balance payment of ${currency} ${balance.toLocaleString()}`;
  }
  
  // Processing without delivery address
  if (['processing', 'ready_to_ship'].includes(status) && !delivery_address_id) {
    return 'Waiting for customer to provide delivery address';
  }
  
  // Payment received but not fully paid
  if (status === 'payment_received' && payment_status !== 'fully_paid' && payment_status !== 'overpaid') {
    return 'Order cannot proceed until fully paid';
  }

  // Pending payment with no verified deposit
  if (status === 'pending_payment' && (payment_status === 'unpaid' || !payment_status)) {
    return 'Waiting for customer to submit payment proof';
  }
  
  return null;
};

/**
 * Check if an order can proceed to shipping
 */
export const canProceedToShipping = (order: {
  payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid' | null;
  delivery_address_id?: string | null;
}): { allowed: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  
  // Check payment status
  if (order.payment_status !== 'fully_paid' && order.payment_status !== 'overpaid') {
    reasons.push('Requires full payment');
  }
  
  // Check delivery address
  if (!order.delivery_address_id) {
    reasons.push('Requires delivery address');
  }
  
  return {
    allowed: reasons.length === 0,
    reasons,
  };
};
