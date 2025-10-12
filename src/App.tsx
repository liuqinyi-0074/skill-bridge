// src/App.tsx
import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AnalyzerEntry from "./pages/Analyzer/AnalyzerEntry";
import { useAppDispatch } from "./store/hooks";
import { resetAnalyzer } from "./store/analyzerSlice";

// Lazy load components without type assertions to avoid conflicts
const Home = lazy(() => import("./pages/Home"));
const Insight = lazy(() => import("./pages/Insight"));
const Profile = lazy(() => import("./pages/Profile"));
const Feedback = lazy(() => import("./pages/Feedback"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-transparent"
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}

export default function App() {
  const { pathname, hash } = useLocation();
  const dispatch = useAppDispatch();

  // Scroll to top on route change (except when using hash links)
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  // Auto-cleanup: Clear all data when page closes or refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear Redux state
      dispatch(resetAnalyzer());

    };

    // Listen for page close/refresh
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dispatch]);

  return (
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
  );
}