import { useEffect, useRef, useState } from 'react'

/* Pages rendered inside Layout's <main> sit below the navbar and above the
   fixed bottom nav, but percentage/flex heights don't reliably cascade
   through nested containers on real mobile browsers, and a guessed
   calc(100dvh - <constants>) drifts from reality by whatever the device's
   safe-area insets are (e.g. the iPhone home-indicator strip), leaving the
   page slightly taller than the visible screen -- which makes the whole
   page scrollable and can hide content up/down behind the bottom nav or
   browser chrome.

   This measures the actual available space at runtime instead: the
   distance from this element's top to the viewport bottom, minus the
   bottom nav's real rendered height (which already includes its own
   safe-area padding). Falls back to a calc() estimate for the first frame
   before layout has settled. */
export function useAppScreenHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const bottomNav = document.getElementById('app-bottom-nav')
      const bottomNavHeight =
        bottomNav && getComputedStyle(bottomNav).display !== 'none' ? bottomNav.getBoundingClientRect().height : 0
      const available = window.innerHeight - top - bottomNavHeight
      if (available > 100) setHeight(available)
    }
    measure()
    const raf = requestAnimationFrame(measure)
    const settleTimer = window.setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  const fallback = `calc(100dvh - 72px - env(safe-area-inset-top, 0px)${isDesktop ? '' : ' - 56px'})`
  return { ref, style: height != null ? `${height}px` : fallback }
}
