# Memory: features/credit-terms-system-v5-2
Updated: now

Phase 5.2 (Credit Terms & Deferred Payment) enables trusted customers to use deferred payment (Net 7/14/30) for orders:

1. **Data Model**: Orders now track `credit_amount_used`, `credit_terms_days`, and `credit_due_date`. The `customer_credit_ledger` view provides admin visibility into credit usage with overdue highlighting.

2. **Core RPCs**:
   - `apply_credit_to_order(p_order_id)`: Atomically validates eligibility (active credit, trust tier, no overdue, sufficient limit) and updates order + customer balance
   - `release_credit_from_order(p_order_id)`: Admin-only function to reverse credit on order cancellation
   - `check_credit_eligibility_v2(p_customer_id)`: Enhanced eligibility check including trust tier, available credit, and overdue status

3. **Eligibility Rules**:
   - Credit terms must be `active` status
   - Trust tier must be `trusted` or `preferred` (from Phase 5.1)
   - No existing overdue credit balances
   - Sufficient available credit (limit - balance >= order total)

4. **Frontend Components**:
   - `CreditPaymentOption`: Customer-facing payment selection with eligibility feedback
   - `CreditLedgerPanel`: Admin view of credit history with overdue tracking
   - `CustomerCreditStatus`: Customer portal widget showing available credit and next due date
   - `useOrderCreditMutations`: Hook for apply/release credit operations

5. **Security**: All credit operations are logged with `high` severity. `release_credit_from_order` restricted to admin/super_admin roles.
