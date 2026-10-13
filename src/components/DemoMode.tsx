import { DEMO_MODE, switchDemoMode } from "../lib/demo/mode";
import { persistor } from "../store";
export default function DemoMode() {
  return (
    <aside
      aria-label="Data mode"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <strong>{DEMO_MODE ? "Demo Mode" : "Live Mode"}</strong>
        <p>
          {DEMO_MODE
            ? "Local sample data. Career options, courses and market figures are illustrative. Your demo plan is saved separately."
            : "Try the full career planner with local sample data, without a backend."}
        </p>
        {DEMO_MODE && (
          <p>
            Try Professional, Scientific and Technical Services and search
            analyst.
          </p>
        )}
      </div>
      <button
        type="button"
        className="rounded-md border border-amber-700 px-3 py-2 font-semibold"
        onClick={async () => {
          await persistor.flush();
          switchDemoMode();
        }}
      >
        {DEMO_MODE ? "Exit Demo Mode" : "Enter Demo Mode"}
      </button>
    </aside>
  );
}
