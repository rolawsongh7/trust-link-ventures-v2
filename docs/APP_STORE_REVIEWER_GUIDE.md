# App Store Reviewer Guide

## Test Accounts

### Customer Account
- **Email:** appstore-customer@trustlinkventures.com
- **Password:** AppleReview2024!
- **Features:** Browse catalog, add to cart, place orders, view order history, track deliveries

### Admin Account  
- **Email:** appstore-admin@trustlinkventures.com
- **Password:** AppleReview2024!
- **Features:** Dashboard, product management, order management, customer management, quote management

## App Flow for Review

### 1. Home Page (Public Access)
- No login required
- Browse featured products
- View company information
- Access to customer login and admin login

### 2. Customer Portal
**Login with customer credentials above**
- Browse product catalog with search and filters
- Add products to cart
- Request custom quotes
- Place orders
- Upload payment proof (uses Camera/Photos permission)
- Add delivery addresses (uses Location permission for auto-fill)
- Track order status
- View order history
- Receive push notifications for order updates (Push notification permission)

### 3. Admin Portal
**Login with admin credentials above (access via /admin/login)**
- Dashboard with analytics
- Product management (add, edit, delete products)
- Order management (process orders, update status)
- Customer management
- Quote management
- Communication tracking

## Special Features to Test

### Camera & Photos Permission
1. Login as customer
2. Go to an order
3. Tap "Upload Payment Proof"
4. Select photo from library or take new photo
5. Permission prompt will appear on first use

### Location Permission
1. Login as customer
2. Go to "Add Delivery Address"
3. Tap "Use Current Location" to auto-fill address
4. Permission prompt will appear on first use

### Push Notifications
1. On first launch after login
2. Notification permission prompt will appear
3. User can enable/disable in Settings
4. Test notifications for order updates

## Demo Data

The test accounts are pre-populated with:
- **Customer Account:** Sample products in cart, pending orders, completed orders, saved addresses
- **Admin Account:** Access to all features with sample data

## Important Notes

- **Payment Processing:** Test payments will not charge real cards. Payment proof upload is for demonstration purposes.
- **Notifications:** Push notifications are configured for demo purposes and won't spam real devices.
- **Data Privacy:** All test data is isolated and follows privacy policies at https://trustlinkcompany.com/privacy
- **No Signup Required:** Use provided credentials. New signup functionality works but test accounts have pre-populated data for review.

## Support

For any questions during review:
- **Support URL:** https://trustlinkcompany.com/contact
- **Privacy Policy:** https://trustlinkcompany.com/privacy
- **Terms of Service:** https://trustlinkcompany.com/terms

## Technical Details

- **iOS SDK:** Latest Capacitor 7.4.3
- **Minimum iOS Version:** iOS 13.0+
- **Device Support:** iPhone and iPad
- **Orientation:** Portrait (primary)
- **App Size:** ~15-20 MB
