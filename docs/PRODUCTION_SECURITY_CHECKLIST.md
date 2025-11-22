# Production Security Checklist

Before deploying to production or submitting to App Store, verify all items:

## Build Configuration
- [ ] Run `npm run build:prod` successfully
- [ ] Production validation script passes (no critical/high issues)
- [ ] Console.log statements removed from production build
- [ ] Debugger statements removed
- [ ] Source maps disabled (`sourcemap: false`)
- [ ] Code minification enabled
- [ ] Bundle size under limits (check console warnings)

## Environment Variables
- [ ] All secrets stored in environment variables (not hardcoded)
- [ ] API keys not exposed in client code
- [ ] Database credentials secure
- [ ] ReCAPTCHA keys configured
- [ ] Supabase keys configured

## Security Features
- [ ] HTTPS enforced for all requests
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] Rate limiting configured
- [ ] Content Security Policy configured
- [ ] Admin routes blocked on native apps
- [ ] Biometric authentication working (Phase 3)
- [ ] Secure storage implemented (Phase 2)

## Authentication & Authorization
- [ ] MFA available for admin users
- [ ] Password strength validation enforced
- [ ] Session timeout configured
- [ ] Failed login attempts tracked
- [ ] Admin access properly restricted
- [ ] Role-based access control working

## Data Protection
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] Auth tokens stored in secure storage (Keychain on iOS)
- [ ] Payment data never stored in localStorage
- [ ] PII (Personally Identifiable Information) protected
- [ ] Audit logging enabled for sensitive operations

## Mobile-Specific
- [ ] Info.plist usage descriptions complete
- [ ] App icon configured (1024x1024)
- [ ] Launch screen configured
- [ ] Push notification permissions requested
- [ ] Camera/photo permissions requested
- [ ] Location permissions requested (if needed)
- [ ] Biometric authentication configured
- [ ] Deep link blocking verified

## Performance
- [ ] App launches in under 3 seconds
- [ ] No memory leaks detected
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] Lazy loading implemented
- [ ] Network requests optimized

## Testing
- [ ] Tested on real iOS device
- [ ] Tested on real Android device
- [ ] Tested biometric authentication
- [ ] Tested payment flows
- [ ] Tested offline behavior
- [ ] Tested error scenarios
- [ ] Tested admin blocking on mobile

## App Store Specific
- [ ] Test accounts created and documented
- [ ] App metadata prepared
- [ ] Screenshots captured (5-10)
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Support URL configured
- [ ] App Store reviewer guide complete

## Documentation
- [ ] API documentation updated
- [ ] User guide available
- [ ] Admin documentation complete
- [ ] Deployment guide updated
- [ ] Security documentation complete

## Final Validation
- [ ] No hardcoded credentials
- [ ] No exposed secrets
- [ ] No development URLs
- [ ] No TODO/FIXME in production code
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan performed

---

## Certificate Pinning (Advanced)

Certificate pinning prevents MITM (Man-in-the-Middle) attacks by validating SSL certificates.

### iOS Implementation

Add to `ios/App/App/AppDelegate.swift`:

```swift
import Security

class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Configure URLSession with certificate pinning
        configureCertificatePinning()
        
        return true
    }
    
    private func configureCertificatePinning() {
        let configuration = URLSessionConfiguration.default
        configuration.urlCredentialStorage = nil
        
        // Add your Supabase certificate pins here
        // Get certificate hashes from your Supabase project
        let pinnedHosts = [
            "your-project.supabase.co": [
                "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
            ]
        ]
        
        // Implement certificate validation in URLSessionDelegate
    }
}
```

### Android Implementation

Add to `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config>
        <domain includeSubdomains="true">your-project.supabase.co</domain>
        <pin-set>
            <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
            <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### Getting Certificate Hashes

```bash
# For Supabase
openssl s_client -servername your-project.supabase.co \
  -connect your-project.supabase.co:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Testing Certificate Pinning

1. Deploy app with certificate pinning
2. Try intercepting traffic with proxy (Charles, Burp)
3. Verify connection fails (certificate mismatch)
4. Check logs for pinning errors

---

**Last Updated:** [Date]
**Reviewed By:** [Name]
**Approved For Production:** [ ] Yes / [ ] No
