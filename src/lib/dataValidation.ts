import { supabase } from '@/integrations/supabase/client';
import { logError } from './errorMonitoring';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DataValidator {
  /**
   * Validates an order for completeness and consistency
   */
  static async validateOrder(orderId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Fetch order with related data
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers!inner(id, company_name, email),
          order_items(id, total_price)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        errors.push(`Failed to fetch order: ${orderError.message}`);
        return { isValid: false, errors, warnings };
      }

      // Validation 1: Customer association
      if (!order.customer_id) {
        errors.push('Order has no associated customer');
      }

      // Validation 2: Order items exist
      if (!order.order_items || order.order_items.length === 0) {
        errors.push('Order has no line items');
      }

      // Validation 3: Total amount consistency
      const calculatedTotal = order.order_items?.reduce(
        (sum: number, item: any) => sum + Number(item.total_price || 0),
        0
      ) || 0;
      
      const orderTotal = Number(order.total_amount || 0);
      const variance = Math.abs(calculatedTotal - orderTotal);
      
      if (variance > 0.01) {
        errors.push(
          `Total amount mismatch: Order shows ${orderTotal}, items total ${calculatedTotal}`
        );
      }

      // Validation 4: Status-specific requirements
      if (['ready_to_ship', 'shipped', 'delivered'].includes(order.status)) {
        if (!order.delivery_address_id) {
          errors.push('Order requires delivery address for current status');
        }
        
        if (order.status === 'shipped' && !order.tracking_number) {
          warnings.push('Shipped order has no tracking number');
        }
      }

      // Validation 5: Payment validation
      if (order.status === 'payment_received' && !order.payment_reference) {
        warnings.push('Payment received but no payment reference recorded');
      }

      // Validation 6: Quote linkage
      if (order.quote_id) {
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .select('id, status, customer_id')
          .eq('id', order.quote_id)
          .single();

        if (quoteError) {
          warnings.push('Linked quote could not be verified');
        } else if (quote.customer_id !== order.customer_id) {
          errors.push('Order customer does not match quote customer');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      logError({ component: 'DataValidator', action: 'VALIDATE_ORDER', error, context: { orderId } });
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings,
      };
    }
  }

  /**
   * Checks for duplicate orders linked to the same quote
   */
  static async checkDuplicateOrder(quoteId: string): Promise<{
    isDuplicate: boolean;
    existingOrderId?: string;
    existingOrderNumber?: string;
  }> {
    try {
      const { data: existingOrders, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('quote_id', quoteId)
        .limit(1);

      if (error) {
        logError({ component: 'DataValidator', action: 'CHECK_DUPLICATE', error, context: { quoteId } });
        return { isDuplicate: false };
      }

      if (existingOrders && existingOrders.length > 0) {
        return {
          isDuplicate: true,
          existingOrderId: existingOrders[0].id,
          existingOrderNumber: existingOrders[0].order_number,
        };
      }

      return { isDuplicate: false };
    } catch (error: any) {
      logError({ component: 'DataValidator', action: 'CHECK_DUPLICATE_EXCEPTION', error, context: { quoteId } });
      return { isDuplicate: false };
    }
  }

  /**
   * Validates a quote before it can be converted to an order
   */
  static async validateQuoteForConversion(quoteId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for existing order
      const duplicateCheck = await this.checkDuplicateOrder(quoteId);
      if (duplicateCheck.isDuplicate) {
        errors.push(
          `Quote already has an order: ${duplicateCheck.existingOrderNumber}`
        );
      }

      // Fetch quote with items
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items(id, total_price)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        errors.push(`Failed to fetch quote: ${quoteError.message}`);
        return { isValid: false, errors, warnings };
      }

      // Validation 1: Quote must have customer
      if (!quote.customer_id && !quote.customer_email) {
        errors.push('Quote has no customer information');
      }

      // Validation 2: Quote must have items
      if (!quote.quote_items || quote.quote_items.length === 0) {
        errors.push('Quote has no line items');
      }

      // Validation 3: Quote status
      if (quote.status !== 'accepted') {
        warnings.push(`Quote status is '${quote.status}', not 'accepted'`);
      }

      // Validation 4: Quote expiry
      if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
        warnings.push('Quote has expired');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      logError({ component: 'DataValidator', action: 'VALIDATE_QUOTE_CONVERSION', error, context: { quoteId } });
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings,
      };
    }
  }

  /**
   * Validates customer data completeness
   */
  static async validateCustomer(customerId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        errors.push(`Failed to fetch customer: ${error.message}`);
        return { isValid: false, errors, warnings };
      }

      // Required fields
      if (!customer.company_name) errors.push('Missing company name');
      if (!customer.email) errors.push('Missing email');
      if (!customer.country) errors.push('Missing country');

      // Recommended fields
      if (!customer.contact_name) warnings.push('Missing contact name');
      if (!customer.phone) warnings.push('Missing phone number');

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      logError({ component: 'DataValidator', action: 'VALIDATE_CUSTOMER', error, context: { customerId } });
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings,
      };
    }
  }
}
