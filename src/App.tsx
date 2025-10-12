// src/App.tsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import MainLayout from "./layouts/MainLayout"
import ErrorBoundary from "./components/common/ErrorBoundary"
import AnalyzerEntry from "./pages/Analyzer/AnalyzerEntry"
import { useAppDispatch } from "./store/hooks"
import { resetAnalyzer } from "./store/analyzerSlice"

// Read password from environment variable injected by Vite.
// If undefined or empty, the gate will auto-unlock to avoid lockouts in dev.
const PASSWORD: string | undefined = import.meta.env.VITE_SITE_PASSWORD

// Lazy load pages to reduce initial bundle size.
const Home = lazy(() => import("./pages/Home"))
const Insight = lazy(() => import("./pages/Insight"))
const Profile = lazy(() => import("./pages/Profile"))
const Feedback = lazy(() => import("./pages/Feedback"))
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"))
const Terms = lazy(() => import("./pages/Terms"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))

/**
 * Spinner
 * -------
 * Small, accessible loading indicator for Suspense fallbacks.
 */
function Spinner(): React.ReactElement {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-transparent"
        aria-label="Loading"
        role="status"
      />
    </div>
  )
}

/**
 * PasswordGate
 * ------------
 * Frontend guard that asks for a password before rendering the real app.
 *
 * How it works:
 * - If PASSWORD is missing, we skip the gate to avoid accidental lockouts.
 * - If present, we show a simple form. On success we set a localStorage flag.
 * - On reload, the flag keeps the app unlocked until the user clears storage.
 *
 * Security note:
 * - This is a UX gate. For real security, verify on a server or use Basic Auth.
 */
function PasswordGate(props: { children: React.ReactElement }): React.ReactElement {
  const shouldGate = useMemo<boolean>(() => {
    // Gate only when a non-empty password is configured.
    return typeof PASSWORD === "string" && PASSWORD.trim().length > 0
  }, [])

  const [input, setInput] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!shouldGate) return true
    return localStorage.getItem("site_unlocked") === "true"
  })

  /** Validate the entered password and unlock on success. */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!shouldGate) {
      setUnlocked(true)
      return
    }
    if (input === PASSWORD) {
      localStorage.setItem("site_unlocked", "true")
      setUnlocked(true)
      setError("")
    } else {
      setError("Incorrect password")
    }
  }

  if (unlocked) return props.children

  // Locked screen: minimal dependencies, keyboard-friendly form.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
        aria-label="Password gate"
      >
        <h1 className="mb-1 text-center text-2xl font-semibold text-gray-800">
          Enter Access Password
        </h1>
        <p className="mb-4 text-center text-sm text-gray-500">
          Access to this site requires a password.
        </p>

        <label htmlFor="site-password" className="sr-only">
          Password
        </label>
        <input
          id="site-password"
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none"
        />

        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-white hover:bg-primary/90 focus:outline-none"
        >
          Unlock
        </button>

        {error && (
          <p role="alert" className="mt-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}

export default function App(): React.ReactElement {
  const { pathname, hash } = useLocation()
  const dispatch = useAppDispatch()

  /**
   * Scroll restore:
   * - Navigate to top on each route change unless navigating to a hash anchor.
   */
  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, hash])

  /**
   * Auto-cleanup on tab close/refresh:
   * - Resets Analyzer-related Redux state to avoid stale data on the next session.
   */
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      dispatch(resetAnalyzer())
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [dispatch])

  // App routes are wrapped by PasswordGate.
  return (
    <PasswordGate>
      <ErrorBoundary feedbackHref="/feedback" onError={(e) => console.error(e)}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="analyzer" element={<Navigate to="/analyzer/intro" replace />} />
              <Route path="analyzer/*" element={<AnalyzerEntry />} />
              <Route path="insight" element={<Insight />} />
              <Route path="insight/:anzsco" element={<Insight />} />
              <Route path="profile" element={<Profile />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<Terms />} />

              {/* 404 */}
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </PasswordGate>
  )
}
