# iOS Legal & Privacy Configuration

This document contains the required Info.plist entries for App Store submission compliance.

## Setup Instructions

### Step 1: Add iOS Platform
```bash
npx cap add ios
```

### Step 2: Configure Info.plist

Navigate to `ios/App/App/Info.plist` and add the following entries:

```xml
<!-- Camera Permission -->
<key>NSCameraUsageDescription</key>
<string>We need camera access to capture proof of payment documents (invoices, receipts, bank transfers) for order verification.</string>

<!-- Photo Library Permission -->
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select payment proof documents for upload.</string>

<!-- Location Permission -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to auto-fill delivery addresses for accurate shipping of your frozen food orders.</string>

<!-- Push Notifications -->
<key>NSUserNotificationsUsageDescription</key>
<string>We send notifications for order updates, delivery status, payment reminders, and important account alerts.</string>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### Step 3: Build and Sync
```bash
npm run build
npx cap sync ios
npx cap open ios
```

## App Store Connect Requirements

### Privacy Policy URL
- **Production URL**: `https://trustlinkcompany.com/privacy`
- **Staging URL**: `https://customer.trustlinkcompany.com/privacy`
- Must be accessible without authentication ✅

### Terms of Service URL
- **Production URL**: `https://trustlinkcompany.com/terms`
- Must be accessible without authentication ✅

### App Privacy Details (Declare in App Store Connect)

#### Data Collection
- **Contact Info**: Name, email, phone number
  - Purpose: User account creation and communication
  - Linked to user identity: Yes

- **Location**: Approximate location
  - Purpose: Delivery address auto-fill
  - Linked to user identity: Yes

- **Identifiers**: User ID
  - Purpose: Account management
  - Linked to user identity: Yes

- **User Content**: Photos/videos (payment proofs)
  - Purpose: Payment verification
  - Linked to user identity: Yes

#### Device Permissions Used
- ✅ Camera: Payment proof uploads
- ✅ Photo Library: Payment proof uploads
- ✅ Location: Delivery address auto-fill
- ✅ Push Notifications: Order updates and alerts

### Legal Pages Content
All required legal pages are implemented:
- Privacy Policy: `/privacy` (LegalDialogs.tsx)
- Terms of Service: `/terms` (LegalDialogs.tsx)
- Cookie Policy: `/cookies` (LegalDialogs.tsx)

### Compliance Checklist
- [x] Privacy Policy URL accessible without login
- [x] Terms of Service accessible without login
- [x] Info.plist usage descriptions documented
- [x] Camera permission usage description
- [x] Photo library permission usage description
- [x] Location permission usage description
- [x] Push notification permission usage description
- [x] Third-party asset attribution added (Unsplash)
- [ ] iOS platform added (`npx cap add ios`)
- [ ] Info.plist configured with usage descriptions
- [ ] App Store Connect legal fields filled
- [ ] Privacy questionnaire completed in App Store Connect
- [ ] Age rating determined
- [ ] Export compliance answered

## Testing Checklist

Test on real iOS device:
- [ ] Camera permission prompt shows correct description
- [ ] Location permission prompt shows correct description
- [ ] Push notification permission prompt shows correct description
- [ ] Privacy policy page loads correctly
- [ ] Terms page loads correctly
- [ ] All legal dialogs work in the app

## Important Notes

1. **Privacy Policy Accessibility**: Both `/privacy` and `/terms` routes are under `PublicLayout` in App.tsx, making them accessible without authentication.

2. **Image Attribution**: Unsplash fallback image now includes proper attribution in ProductCard.tsx (line 70-72).

3. **Capacitor Configuration**: The `capacitor.config.json` already includes iOS scheme and plugin configurations.

4. **Next Steps**: 
   - Run `npx cap add ios` to create iOS platform
   - Configure Info.plist with the entries above
   - Submit to App Store Connect with legal URLs

## Legal Contact Information
- General inquiries: info@trustlinkventures.com
- Privacy concerns: privacy@trustlinkventures.com
- Support: Available via contact form at /contact

## Effective Dates
- Terms of Service: August 5, 2025
- Privacy Policy: November 22, 2025
- Cookie Policy: November 22, 2025
