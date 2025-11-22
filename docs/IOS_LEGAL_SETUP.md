# iOS Legal & Security Configuration

This document contains the required Info.plist entries for App Store submission compliance and security configuration.

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

<!-- Face ID Permission -->
<key>NSFaceIDUsageDescription</key>
<string>Trust Link Ventures uses Face ID to secure access to your account and authorize sensitive operations like payments, password changes, and admin actions.</string>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

---

## Biometric Authentication Configuration

### Testing Biometric Authentication
1. Run app on real iPhone device or simulator with biometric capability
2. Test Face ID: iPhone X or newer
3. Test Touch ID: iPhone 8 or older
4. Test passcode fallback when biometric fails
5. Verify graceful degradation on devices without biometric

### Fallback Behavior
- If biometric unavailable: App continues normally
- If user cancels: Operation is blocked
- If biometric fails: User can retry or use passcode
- On web: Biometric is skipped entirely

---

## Native Admin Route Protection

### iOS AppDelegate Configuration

For maximum security, add native-level URL blocking in `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ app: UIApplication, 
                    open url: URL,
                    options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        
        // Block any admin-related deep links at native level
        let blockedPaths = ["/admin", "/dashboard", "/crm", "/settings"]
        let urlString = url.absoluteString.lowercased()
        
        for blockedPath in blockedPaths {
            if urlString.contains(blockedPath) {
                print("[Security] Blocked admin URL attempt: \(url)")
                return false
            }
        }
        
        // Allow other URLs
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
```

### Android MainActivity Configuration

For Android, add similar blocking in `android/app/src/main/java/.../MainActivity.java`:

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Block admin routes
    Intent intent = getIntent();
    Uri data = intent.getData();
    
    if (data != null) {
        String url = data.toString().toLowerCase();
        String[] blockedPaths = {"/admin", "/dashboard", "/crm", "/settings"};
        
        for (String path : blockedPaths) {
            if (url.contains(path)) {
                Log.w("Security", "Blocked admin URL: " + url);
                // Redirect to home
                Intent homeIntent = new Intent(Intent.ACTION_VIEW);
                homeIntent.setData(Uri.parse("https://trustlinkcompany.com"));
                startActivity(homeIntent);
                finish();
                return;
            }
        }
    }
}
```

### Testing URL Blocking

Test these scenarios on physical device:
1. Try accessing `trustlink://admin/dashboard`
2. Try accessing `https://trustlinkcompany.com/admin`
3. Try accessing `myapp://admin?token=123`
4. Verify all redirect to home page
5. Check audit_logs table for security events

---

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
- ✅ Face ID/Touch ID: Secure authentication

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
- [x] Face ID usage description
- [x] Third-party asset attribution added (Unsplash)
- [x] Admin route blocking implemented
- [x] Biometric authentication implemented
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
- [ ] Face ID permission prompt shows correct description
- [ ] Privacy policy page loads correctly
- [ ] Terms page loads correctly
- [ ] All legal dialogs work in the app
- [ ] Biometric authentication works on admin login
- [ ] Biometric authentication works on payment
- [ ] Biometric authentication works on password change
- [ ] Admin routes blocked via URL
- [ ] Admin routes blocked via deep links

## Important Notes

1. **Privacy Policy Accessibility**: Both `/privacy` and `/terms` routes are under `PublicLayout` in App.tsx, making them accessible without authentication.

2. **Image Attribution**: Unsplash fallback image now includes proper attribution in ProductCard.tsx (line 70-72).

3. **Capacitor Configuration**: The `capacitor.config.json` already includes iOS scheme and plugin configurations with admin URL blocking.

4. **Security Features**: 
   - Biometric authentication for sensitive operations
   - Admin route blocking at multiple levels
   - Secure storage for authentication tokens
   - Production build hardening

5. **Next Steps**: 
   - Run `npx cap add ios` to create iOS platform
   - Configure Info.plist with the entries above
   - Submit to App Store Connect with legal URLs
   - Test all biometric flows on real device

## Legal Contact Information
- General inquiries: info@trustlinkventures.com
- Privacy concerns: privacy@trustlinkventures.com
- Support: Available via contact form at /contact

## Effective Dates
- Terms of Service: August 5, 2025
- Privacy Policy: November 22, 2025
- Cookie Policy: November 22, 2025

---

**Last Updated:** [Date]
**Version:** 2.0.0 (Security Enhanced)

