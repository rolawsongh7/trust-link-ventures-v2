# Trust Link Ventures Mobile App - QA Checklist

## Pre-Deployment Checklist for iOS & Android

### 1. Navigation & Routing (Public Site)

- [ ] Homepage (`/`) loads without horizontal scroll at 375px width
- [ ] About page (`/about`) loads without horizontal scroll at 375px
- [ ] Products page (`/products`) loads without horizontal scroll at 375px
- [ ] Partners page (`/partners`) loads without horizontal scroll at 375px
- [ ] Contact page (`/contact`) loads without horizontal scroll at 375px
- [ ] All pages load within 3 seconds on 3G connection
- [ ] Back button works correctly on all pages
- [ ] Deep links work (if applicable)

### 2. Portal Flow (Customer Routes)

- [ ] `/portal/login` (or `/portal-auth`) loads correctly
- [ ] Login form accepts valid credentials
- [ ] Login form shows errors for invalid credentials
- [ ] After login, redirects to `/portal` dashboard
- [ ] Dashboard shows correct customer data
- [ ] Navigate to `/portal/orders` - page loads and shows orders
- [ ] Click on an order - detail page loads
- [ ] Back button returns to orders list
- [ ] Session persists across app backgrounding/foregrounding
- [ ] Session persists across tab/route changes
- [ ] Logout works and redirects to home

### 3. Admin Blocking (Critical Security Test)

- [ ] Attempt to navigate to `/admin` - immediate redirect to `/`
- [ ] Attempt to navigate to `/admin/login` - immediate redirect to `/`
- [ ] Attempt to navigate to `/admin/dashboard` - immediate redirect to `/`
- [ ] Attempt to navigate to any `/admin/*` route - all redirect to `/`
- [ ] No "Admin" text visible in any headers or menus
- [ ] No admin links in mobile navigation
- [ ] Check browser DevTools Network tab - no requests to admin endpoints
- [ ] BlockAdmin component working (console should log redirect attempt)

### 4. Touch Targets & Accessibility

- [ ] All buttons are ≥ 44×44 pixels (iOS standard)
- [ ] All tap targets have adequate spacing (8px minimum)
- [ ] Navigation items are easily tappable
- [ ] Form inputs are ≥ 44px tall
- [ ] Floating buttons don't overlap bottom nav
- [ ] Floating buttons don't overlap iOS home indicator
- [ ] All text is ≥ 16px (to prevent iOS zoom on focus)
- [ ] Contrast ratio passes WCAG AA (4.5:1 for body text)
- [ ] Run Lighthouse Accessibility audit - score ≥ 90

### 5. Visual & Layout

- [ ] No horizontal scrolling on any page (320px to 428px width)
- [ ] Images load and display correctly
- [ ] Images have proper aspect ratios (no stretching)
- [ ] Safe area insets respected on notched devices (iPhone X+)
- [ ] Bottom navigation doesn't overlap content
- [ ] Status bar area handled correctly (iOS)
- [ ] Keyboard pushes content up (doesn't obscure inputs)
- [ ] Portrait orientation works correctly
- [ ] Landscape orientation works correctly (if supported)

### 6. Bottom Navigation (Native App Only)

- [ ] Bottom nav shows 4 tabs: Home, Products, About, Portal
- [ ] Active tab highlighted correctly
- [ ] Tapping tabs navigates correctly
- [ ] Tab icons display correctly
- [ ] Tab labels are readable
- [ ] Bottom nav respects safe area (iPhone home indicator)
- [ ] Bottom nav hidden on web version
- [ ] Bottom nav switches to Portal tabs when logged in

### 7. Performance

- [ ] App launches in < 3 seconds
- [ ] Page transitions are smooth (60fps)
- [ ] No janky scrolling
- [ ] Images lazy-load correctly
- [ ] Large lists render performantly (virtualization if needed)
- [ ] No memory leaks (test with Chrome DevTools)
- [ ] App doesn't crash when backgrounded/foregrounded repeatedly

### 8. Offline & Edge Cases

- [ ] Offline banner shows when connection lost (if implemented)
- [ ] App shows meaningful error messages (not technical jargon)
- [ ] Form validation works correctly
- [ ] Loading states show for async operations
- [ ] Empty states display when no data available
- [ ] Error states display when data fetch fails
- [ ] Pull-to-refresh works (native app)

### 9. File Operations (If Applicable)

- [ ] File upload works from camera
- [ ] File upload works from gallery
- [ ] Files download correctly
- [ ] Downloaded files can be opened
- [ ] File preview works correctly

### 10. Notifications (If Enabled)

- [ ] Permission request shows on first launch
- [ ] Push notifications received correctly
- [ ] Local notifications triggered at right time
- [ ] Notification tap opens correct screen
- [ ] Badge count updates correctly (iOS)

### 11. Authentication & Security

- [ ] Login works with valid credentials
- [ ] Login fails gracefully with invalid credentials
- [ ] Session timeout works (if implemented)
- [ ] Biometric login works (if implemented)
- [ ] Password reset flow works
- [ ] No sensitive data in console logs
- [ ] No API keys exposed in client code
- [ ] Secure storage used for tokens

### 12. App Store Readiness

- [ ] App icon displays correctly (all sizes)
- [ ] Splash screen displays correctly
- [ ] App name correct in launcher
- [ ] Version number correct
- [ ] Privacy policy link works
- [ ] Terms of service link works
- [ ] App doesn't crash on launch
- [ ] App passes all store review guidelines

### Device-Specific Tests

**iOS:**
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (notch)
- [ ] Test on iPhone 14 Pro Max (large screen)
- [ ] Test on iPad (if supporting tablets)
- [ ] Dark mode works correctly
- [ ] Dynamic Type respects user font size

**Android:**
- [ ] Test on small screen device (< 5 inches)
- [ ] Test on medium screen device (5-6 inches)
- [ ] Test on large screen device (> 6 inches)
- [ ] Test on tablet (if supporting tablets)
- [ ] Dark mode works correctly
- [ ] Back button works correctly (hardware/software)

### Final Sign-Off

- [ ] All critical issues resolved
- [ ] All high-priority issues resolved
- [ ] Medium/low issues documented for future releases
- [ ] Screenshots taken for store listing
- [ ] App Store metadata prepared
- [ ] Google Play metadata prepared
- [ ] Submitted to TestFlight/Internal Testing
- [ ] Beta testers invited and feedback received
- [ ] Final build submitted to stores

---

**Notes:**
- Test on real devices, not just simulators/emulators
- Test with slow network (throttle in DevTools)
- Test with different iOS/Android versions
- Document any device-specific issues
