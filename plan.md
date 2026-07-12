# Bundle Size Optimization Plan

## Stage 1: Remove unused dependencies from package.json
Remove: three, @react-three/fiber, @react-three/drei, gsap, @gsap/react, @hookform/resolvers, zod, @capacitor/* (all 7), lenis, react-day-picker, cmdk, embla-carousel-react, input-otp, vaul, recharts, next-themes
Keep: sonner (no longer needs next-themes since v2 uses its own theming)

## Stage 2: Remove unused UI components
Delete: chart.tsx, carousel.tsx, command.tsx, drawer.tsx, input-otp.tsx, calendar.tsx, context-menu.tsx, hover-card.tsx, menubar.tsx

## Stage 3: Lazy-load ALL page components
Currently only Admin/Privacy/Terms/Support are lazy. Need to lazy-load: Community, CreatePost, Profile, Notifications, Messages, Chat.

## Stage 4: Add Vite manual chunks
Split vendor code into separate chunks: supabase, framer-motion, react-router.

## Stage 5: Audit date-fns usage and inline if small

## Stage 6: Build, verify, deploy
