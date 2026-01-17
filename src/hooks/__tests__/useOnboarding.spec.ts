/**
 * Onboarding Behavior Specification
 * 
 * This file documents the expected behavior of the useOnboarding hook.
 * It serves as a specification for how onboarding should work in all user states.
 * 
 * To validate behavior manually:
 * 1. Create a new account and verify onboarding shows
 * 2. Complete onboarding and verify it never shows again
 * 3. Create another account, click "Don't show again" and verify persistence
 * 4. Create another account, click "Skip for now" and verify session behavior
 * 5. Create an account with all fields pre-filled and verify onboarding doesn't show
 */

// Session storage key used by useOnboarding hook
export const SESSION_SKIP_KEY = 'onboarding_skipped_session';

/**
 * BEHAVIOR RULES
 * ==============
 * 
 * 1. COMPLETED ONBOARDING
 *    - When: user finishes all onboarding steps
 *    - Effect: onboarding_completed_at is set in DB
 *    - Result: Onboarding NEVER shows again for this user
 * 
 * 2. PERMANENT SKIP ("Don't show again")
 *    - When: user clicks "Don't show again"
 *    - Effect: BOTH onboarding_skipped_at AND onboarding_completed_at are set
 *    - Result: Onboarding NEVER shows again for this user
 * 
 * 3. TEMPORARY SKIP ("Skip for now")
 *    - When: user clicks "Skip for now" or closes the dialog
 *    - Effect: onboarding_skipped_at is set in DB, SESSION_SKIP_KEY is set in sessionStorage
 *    - Result: 
 *      - Within same browser session: Onboarding hidden (via sessionStorage)
 *      - New session within 7 days: Onboarding hidden (via DB check)
 *      - New session after 7 days: Onboarding may show again if profile incomplete
 * 
 * 4. FULLY COMPLETE PROFILE
 *    - When: all required fields are filled (full_name, email, company_name, phone, country, industry)
 *            AND at least one valid (non-placeholder) address exists
 *    - Result: Onboarding doesn't show even if never formally completed
 * 
 * 5. SESSION PERSISTENCE
 *    - sessionStorage survives page refreshes within the same browser tab/window
 *    - sessionStorage is cleared when browser tab/window is closed
 *    - This provides immediate skip effect even if DB update fails
 * 
 * PROFILE COMPLETION REQUIREMENTS
 * ================================
 * All of these fields must be non-null/non-empty for profile to be "complete":
 * - full_name
 * - email
 * - company_name
 * - phone
 * - country
 * - industry
 * 
 * ADDRESS COMPLETION REQUIREMENTS
 * ================================
 * At least one address must exist that is NOT a placeholder address.
 * Placeholder addresses have generic values like "Placeholder" in the receiver_name.
 * 
 * ERROR HANDLING
 * ==============
 * - If DB update fails during skip/complete, session-level skip still works
 * - Console errors are logged for debugging
 * - User experience is not interrupted by DB failures
 */

/**
 * Testing Checklist
 * =================
 * 
 * [ ] New user sees onboarding on first login
 * [ ] Completing all steps sets onboarding_completed_at
 * [ ] After completion, onboarding never appears again
 * [ ] "Don't show again" sets onboarding_completed_at
 * [ ] "Skip for now" hides onboarding for current session
 * [ ] After skipping, refreshing page doesn't show onboarding
 * [ ] After skipping, opening new tab within 7 days doesn't show onboarding
 * [ ] After skipping, new session after 7 days may show onboarding (if incomplete)
 * [ ] User with complete profile doesn't see onboarding
 * [ ] User with complete profile + address doesn't see onboarding
 * [ ] RLS policy allows customers to update their own profile
 * [ ] Session skip works even if DB update fails
 */
