import ServiceUnavailable from "../components/ServiceUnavailable"
import { isServiceUnavailable, subscribeToService } from "../lib/services/availability"
import { DEMO_MODE } from "../lib/demo/mode"
import DemoMode from "../components/DemoMode"
// Layout that renders Header and Footer once, with the active route or outage page.
// Also scrolls to top on route change for better UX.

import { Outlet, useLocation } from "react-router-dom"
import { useEffect, useRef, useMemo, useSyncExternalStore } from "react"
import Header from "../components/Header"
import Footer from "../components/Footer"
const TRANSPARENT_ROUTES = new Set<string>(["/"])

function ScrollTopOnRoute() {
  // Re-run when path changes
  const { pathname } = useLocation()
  useEffect(() => {
    // Jump to the very top on each route change
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname])
  return null
}
export default function MainLayout() {
  const unavailable = useSyncExternalStore(subscribeToService, isServiceUnavailable, () => false)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Scroll to top when the route (pathname) changes.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])

  const transparent = useMemo(
    () => TRANSPARENT_ROUTES.has(pathname),
    [pathname]
  )
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      {/* Skip link for keyboard users */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>

      <Header transparent={transparent}/>

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <ScrollTopOnRoute/>
        <DemoMode />
        {!DEMO_MODE && unavailable ? <ServiceUnavailable /> : <Outlet />}
      </main>

      <Footer />
    </div>
  )
}


