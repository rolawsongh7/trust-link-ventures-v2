# Performance Testing Checklist

Before submitting to App Store or deploying to production, verify all performance requirements are met.

## 🎯 Apple App Store Requirements

### Launch Time (< 3 seconds)
- [ ] **Cold start**: App launches and becomes interactive in < 3s
- [ ] **Warm start**: App resumes in < 1s
- [ ] **Network-dependent pages**: Load within 5s total (including API calls)
- [ ] **Splash screen**: Shows within 500ms

### Frame Rate (60fps minimum)
- [ ] **Scrolling**: All lists and pages scroll smoothly at 60fps
- [ ] **Animations**: No dropped frames during transitions
- [ ] **Touch interactions**: Respond within 100ms
- [ ] **No jank**: No visible stuttering or freezing

### Memory Usage
- [ ] **Initial load**: < 100MB memory usage
- [ ] **After 5 minutes**: < 150MB memory usage
- [ ] **No memory leaks**: Memory doesn't continuously grow
- [ ] **Proper cleanup**: Components unmount cleanly

### Network Performance
- [ ] **Initial bundle**: < 1MB (gzipped)
- [ ] **API responses**: < 500ms with caching
- [ ] **Images**: Load progressively with placeholders
- [ ] **Offline mode**: App functions with cached data

---

## 📱 iOS-Specific Requirements

### Device Compatibility
- [ ] **iPhone 8** (A11 chip, iOS 15): Works smoothly
- [ ] **iPhone 11** (A13 chip, iOS 16): Works smoothly
- [ ] **iPhone 13** (A15 chip, iOS 17): Works smoothly
- [ ] **iPhone 15 Pro** (A17 Pro, iOS 18): Works smoothly
- [ ] **iPad Air** (2020+): Works in portrait and landscape

### Hardware Features
- [ ] **Face ID/Touch ID**: Biometric auth works correctly
- [ ] **Camera**: Photo uploads work if implemented
- [ ] **Location**: GPS functions correctly if implemented
- [ ] **Push Notifications**: Delivery and display work
- [ ] **Background refresh**: App resumes correctly

### Battery & Resources
- [ ] **Battery drain**: Not excessive (< 5% per hour of use)
- [ ] **CPU usage**: Stays reasonable (< 40% average)
- [ ] **Network efficiency**: Minimal unnecessary requests
- [ ] **Background activity**: Properly paused when in background

---

## 🔍 Performance Metrics to Monitor

### Core Web Vitals
- [ ] **LCP (Largest Contentful Paint)**: < 2.5s
- [ ] **FID (First Input Delay)**: < 100ms
- [ ] **CLS (Cumulative Layout Shift)**: < 0.1
- [ ] **FCP (First Contentful Paint)**: < 1.8s
- [ ] **TTI (Time to Interactive)**: < 3.8s

### Lighthouse Scores (Target: 90+)
- [ ] **Performance**: >= 90
- [ ] **Accessibility**: >= 90
- [ ] **Best Practices**: >= 90
- [ ] **SEO**: >= 90

### Bundle Analysis
- [ ] **Total bundle size**: < 2MB uncompressed
- [ ] **Initial chunk**: < 500KB
- [ ] **Lazy loaded chunks**: < 200KB each
- [ ] **No duplicate code**: Tree-shaking working
- [ ] **Vendor chunks**: Properly split

---

## 🧪 Testing Procedures

### 1. Manual Testing on Physical Devices

**iPhone 8 (Minimum Spec)**
```bash
# Test commands
npx cap run ios --target="iPhone-8"
```
- [ ] App launches in < 3s (cold start)
- [ ] Scrolling is smooth at 60fps
- [ ] All features work correctly
- [ ] No crashes or freezes
- [ ] Memory stays under 150MB

**iPhone 15 Pro (Latest)**
```bash
npx cap run ios --target="iPhone-15-Pro"
```
- [ ] App launches in < 1.5s
- [ ] Butter-smooth 120Hz display utilization
- [ ] All animations fluid
- [ ] Memory usage optimized

### 2. Automated Performance Testing

**Run Performance Suite**
```bash
npm run test:performance
```

**Lighthouse CI**
```bash
npm run lighthouse
```

**Bundle Analysis**
```bash
npm run analyze:bundle
```

### 3. Real-World Usage Scenarios

**Test Scenario 1: New User Onboarding**
- [ ] User opens app for first time
- [ ] App loads in < 3s
- [ ] User can sign up/login smoothly
- [ ] First page displays within 1s of authentication

**Test Scenario 2: Heavy Data Page**
- [ ] Load page with 100+ items
- [ ] Initial render < 2s
- [ ] Scrolling remains smooth
- [ ] Search/filter responds instantly

**Test Scenario 3: Image-Heavy Content**
- [ ] Page with 20+ images
- [ ] Progressive loading visible
- [ ] No layout shift during load
- [ ] Thumbnails load first

**Test Scenario 4: Background/Foreground**
- [ ] User backgrounds app (Home button)
- [ ] User returns after 5 minutes
- [ ] App resumes instantly
- [ ] No data loss
- [ ] Biometric re-auth if configured

**Test Scenario 5: Poor Network Conditions**
- [ ] Simulate 3G network
- [ ] App remains responsive
- [ ] Offline mode activates gracefully
- [ ] Cached data displays

---

## 📊 Performance Benchmarks

### Current Performance Goals

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **Cold Start** | < 2s | < 3s | < 5s |
| **FPS (Average)** | 60fps | 50fps | 30fps |
| **Memory (Peak)** | < 100MB | < 150MB | < 200MB |
| **Bundle Size** | < 500KB | < 1MB | < 2MB |
| **API Response** | < 200ms | < 500ms | < 1s |
| **Image Load** | < 1s | < 2s | < 3s |

### Performance Tracking

**Before Optimization**
- Launch Time: ~8s
- Bundle Size: ~2MB
- Image Load: ~25MB
- Memory: ~180MB
- FPS: ~45fps

**After Optimization (Target)**
- Launch Time: < 2s ✅
- Bundle Size: ~500KB ✅
- Image Load: ~4MB ✅
- Memory: < 100MB ✅
- FPS: 60fps ✅

---

## 🛠️ Debugging Performance Issues

### Using Built-in Performance Monitor

1. **Enable debug mode** in development:
   ```typescript
   // src/config/features.ts
   enableDebugMode: true
   ```

2. **Open Performance Monitor**:
   - Press `Ctrl/Cmd + Shift + P`
   - Monitor FPS, Memory, Load Time in real-time

3. **Check console for warnings**:
   ```
   [Performance] Low FPS detected: 28
   [Performance] High memory usage: 165 MB
   [Performance] Long task detected: 87.50ms
   ```

### Using React DevTools Profiler

1. **Install React DevTools** browser extension
2. **Open Profiler tab**
3. **Record a session** while using the app
4. **Look for**:
   - Components that take > 16ms to render
   - Unnecessary re-renders
   - Large component trees

### Using Safari Web Inspector (iOS)

1. **Enable Web Inspector** on iPhone:
   - Settings → Safari → Advanced → Web Inspector
2. **Connect iPhone** to Mac
3. **Open Safari** → Develop → [Your iPhone] → [Your App]
4. **Monitor**:
   - Timelines → CPU usage
   - Storage → Memory usage
   - Network → Request waterfall

---

## ✅ Pre-Submission Checklist

### Performance Validated
- [ ] All manual tests passed on physical devices
- [ ] Automated performance tests passed
- [ ] Lighthouse score >= 90
- [ ] No performance warnings in console
- [ ] Memory leaks checked and fixed

### App Store Requirements Met
- [ ] Launch time < 3 seconds
- [ ] Smooth 60fps scrolling
- [ ] Memory usage < 150MB
- [ ] Works on iPhone 8 and newer
- [ ] No crashes during testing

### Optimizations Applied
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented
- [ ] Bundle size minimized
- [ ] Query caching configured
- [ ] iOS optimizations applied

### Documentation
- [ ] Performance benchmarks recorded
- [ ] Known issues documented
- [ ] Testing results logged
- [ ] Optimization steps documented

---

## 📝 Performance Testing Log

Use this template to record test results:

```markdown
### Test Date: [Date]
### Tester: [Name]
### Device: [iPhone Model]
### iOS Version: [Version]

#### Metrics
- Launch Time (Cold): [X]s
- Launch Time (Warm): [X]s
- Average FPS: [X]
- Memory Usage: [X]MB
- Bundle Size: [X]KB

#### Issues Found
1. [Description of issue]
2. [Description of issue]

#### Status
- [ ] Passed all requirements
- [ ] Minor issues found
- [ ] Critical issues found

#### Notes
[Additional observations]
```

---

## 🔗 Related Documentation

- [Production Security Checklist](./PRODUCTION_SECURITY_CHECKLIST.md)
- [iOS Legal Setup](./IOS_LEGAL_SETUP.md)
- [App Store Submission Guide](./APP_STORE_SUBMISSION.md)

---

**Last Updated**: [Current Date]  
**Next Review**: [30 days from now]
