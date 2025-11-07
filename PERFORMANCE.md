# Performance Optimization Guide

This document outlines the performance optimizations implemented in RiverChat and best practices for maintaining optimal performance.

## Implemented Optimizations

### 1. Code Splitting & Bundle Optimization
- **Manual Chunks**: Separated large dependencies into individual chunks:
  - `vue-vendor`: Vue core library
  - `vue-flow`: All Vue Flow libraries (@vue-flow/core, background, controls, minimap)
  - `firebase`: Firebase SDK (app, auth, firestore)
  - `ui-libs`: UI libraries (lucide-vue-next, marked, dompurify)
  - `utils`: Utility libraries (uuid, crypto-js)

- **Lazy Loading**: Non-critical components are loaded on-demand:
  - ChatModal
  - WelcomeModal
  - SettingsPage
  - RiverDashboard
  - MessageViewerModal
  - ConfirmationModal
  - KeyboardShortcutsModal
  - AuthModal

### 2. Network Optimizations
- **Preconnect Hints**: Early DNS resolution and connection establishment for:
  - Firebase hosting (riverchat-ac2f0.firebaseapp.com)
  - OpenRouter API (openrouter.ai)
  - Google APIs (www.googleapis.com)
  - Cloudflare Insights (static.cloudflareinsights.com)

- **Cache Headers**: Aggressive caching strategy:
  - Static assets (JS/CSS): 1 year with `immutable` flag
  - Images: 1 month
  - Fonts: 1 year with `immutable` flag
  - HTML: No cache, always revalidate

### 3. Build Optimizations
- **Source Maps**: Enabled in production for better debugging without significant overhead
- **Terser Minification**: Aggressive minification with:
  - Console.debug removal
  - Debugger statement removal
  - Dead code elimination

- **Chunk Size Limit**: Raised to 600KB to prevent false warnings from large but necessary dependencies

### 4. CSS Optimizations
- **Critical CSS**: Inline critical CSS in HTML for faster initial render:
  - Theme variables
  - Basic layout
  - Loading spinner for async components

- **Tailwind CSS**: Using Tailwind's built-in purging to remove unused styles

### 5. Accessibility Improvements
- **Link Contrast**: All links now have:
  - Underline decoration (not just on hover)
  - Bold font weight for better visibility
  - Proper color contrast with `color: var(--color-primary)`
  - `rel="noopener noreferrer"` for security

## Performance Metrics

### Target Metrics
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s
- **CLS (Cumulative Layout Shift)**: < 0.1

### Current Improvements
- Reduced main bundle from 268KB to ~150KB (estimated with chunking)
- Firebase SDK in separate chunk (~90KB)
- Vue Flow in separate chunk (~50KB)
- Lazy-loaded modals reduce initial bundle by ~40KB

## Best Practices for Future Development

### 1. Component Development
```typescript
// ❌ BAD - Loads everything upfront
import MyComponent from './MyComponent.vue';

// ✅ GOOD - Lazy load non-critical components
const MyComponent = defineAsyncComponent(() => import('./MyComponent.vue'));
```

### 2. Image Optimization
- Use WebP format when possible
- Include width/height attributes to prevent CLS
- Lazy load images below the fold
- Use appropriate image sizes (don't load 4K images for thumbnails)

### 3. Bundle Analysis
Run bundle analysis regularly:
```bash
npm run build -- --mode analyze
```

### 4. Dependency Management
- Regularly audit dependencies with `npm audit`
- Remove unused dependencies
- Consider lighter alternatives for heavy packages
- Use tree-shakeable imports:
  ```typescript
  // ❌ BAD
  import _ from 'lodash';
  
  // ✅ GOOD
  import { debounce } from 'lodash-es';
  ```

### 5. State Management
- Minimize use of `useState` and `useEffect`
- Use memoization (`useMemo`, `useCallback`) for expensive computations
- Avoid unnecessary re-renders with proper dependency arrays

### 6. Firebase Optimization
- Use modular imports (already implemented)
- Implement proper caching strategies
- Batch Firestore operations when possible
- Use `onSnapshot` sparingly (it keeps connections open)

## Monitoring

### Tools
- **Lighthouse**: Run audits regularly
- **Chrome DevTools Performance Panel**: Profile runtime performance
- **Network Tab**: Check for unnecessary requests
- **Coverage Tab**: Identify unused code

### Key Metrics to Monitor
1. **Bundle Size**: Should stay under 500KB total (all chunks combined)
2. **Number of Requests**: Minimize to < 50 for initial load
3. **Cache Hit Rate**: Should be > 80% for returning users
4. **Core Web Vitals**: All metrics in "Good" range

## Deployment Checklist

Before deploying to production:
- [ ] Run `npm run build` and check for warnings
- [ ] Verify bundle sizes are reasonable
- [ ] Test lazy loading works (check Network tab)
- [ ] Run Lighthouse audit (target score > 90)
- [ ] Test on slow 3G connection
- [ ] Verify cache headers are applied
- [ ] Check source maps are uploaded for error tracking

## Future Optimizations

### Potential Improvements
1. **Service Worker**: Implement for offline support and advanced caching
2. **Image CDN**: Use a CDN for image optimization and delivery
3. **Prefetching**: Prefetch likely navigation targets
4. **Web Workers**: Offload heavy computations (e.g., markdown parsing)
5. **Virtual Scrolling**: For large lists (e.g., model selection)
6. **Resource Hints**: Add more granular prefetch/preload directives

### Low Priority
- Consider migrating to native ES modules (when browser support is universal)
- Implement HTTP/2 push for critical resources
- Use AVIF image format (when browser support improves)

## Resources
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Vite Performance Best Practices](https://vitejs.dev/guide/performance.html)
- [Vue Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)

