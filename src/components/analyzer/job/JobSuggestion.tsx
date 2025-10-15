import { useMemo, useState } from "react";
import clsx from "clsx";

/** Displayable child inside group body */
export type GroupChild = React.ReactNode;

/** Single role item with visible label */
export type RoleItem = {
  id: string;
  label: string;
};

/** Occupation group data type */
export type OccupationGroup = {
  id: string;
  title: string;
  jobsCount?: number;
  shortageCount?: number;
  avgMatch?: number;
  children: GroupChild;
  collapsible?: boolean;
  defaultOpen?: boolean;
  roleItems?: RoleItem[];
};

/** Industry item containing multiple groups */
export type IndustryItem = {
  key: string;
  title: string;
  groupCount?: number;
  groups: OccupationGroup[];
};

/** Main props for JobSuggestion */
export type JobSuggestionProps = {
  industries?: IndustryItem[];
  defaultSelectedKey?: string;
  className?: string;
  expandHint?: string;
  collapseHint?: string;
  selectedRoleId?: string | null;
  onSelectRole?: (id: string | null) => void;
};

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "danger" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-800"
      )}
    >
      {children}
    </span>
  );
}

/** Chevron icon for expand/collapse */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={clsx("h-4 w-4 transition-transform", open ? "rotate-180" : "rotate-0")}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.06l3.71-2.83a.75.75 0 1 1 .92 1.18l-4.2 3.2a.75.75 0 0 1-.92 0l-4.2-3.2a.75.75 0 0 1-.02-1.06z" />
    </svg>
  );
}

/**
 * GroupCard:
 * - Highlights when its role is selected
 * - Clicking role toggles on/off
 */
function GroupCard({
  g,
  expandHint,
  collapseHint,
  selectedRoleId,
  onSelectRole,
}: {
  g: OccupationGroup;
  expandHint: string;
  collapseHint: string;
  selectedRoleId: string | null;
  onSelectRole?: (id: string | null) => void;
}) {
  const [open, setOpen] = useState<boolean>(!!g.defaultOpen);

  const toggle = (): void => {
    if (g.collapsible) setOpen((v) => !v);
  };

  /** Group is active if any of its role IDs match current selectedRoleId */
  const isSelectedGroup = g.roleItems?.some((r) => r.id === selectedRoleId) ?? false;

  return (
    <article
      aria-labelledby={`group-${g.id}`}
      onClick={toggle}
      className={clsx(
        "cursor-pointer rounded-xl border p-4 transition-all",
        isSelectedGroup
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border bg-white hover:shadow-sm"
      )}
      title={open ? collapseHint : expandHint}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 id={`group-${g.id}`} className="text-lg font-semibold text-ink">
            {g.title}
          </h3>
          {typeof g.jobsCount === "number" && (
            <p className="mt-1 text-sm text-ink-soft">{g.jobsCount} jobs</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {typeof g.shortageCount === "number" && <Pill tone="danger">{g.shortageCount} shortages</Pill>}
          {typeof g.avgMatch === "number" && <Pill>{g.avgMatch}%</Pill>}
          {g.collapsible && <Chevron open={open} />}
        </div>
      </div>

      <div className={clsx("mt-4 space-y-2", g.collapsible && !open && "hidden")}>
        {(g.roleItems ?? []).map((role) => {
          const selected = role.id === selectedRoleId;
          return (
            <button
              key={role.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRole?.(selected ? null : role.id);
              }}
              className={clsx(
                "block w-full rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary",
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-ink hover:bg-gray-50"
              )}
            >
              {role.label}
            </button>
          );
        })}

        <div>{g.children}</div>
      </div>
    </article>
  );
}

/** Main JobSuggestion component */
export default function JobSuggestion({
  industries,
  defaultSelectedKey,
  className,
  expandHint = "Expand to show jobs",
  collapseHint = "Collapse to hide jobs",
  selectedRoleId,
  onSelectRole,
}: JobSuggestionProps): React.ReactElement {
  const list = useMemo(() => (Array.isArray(industries) ? industries : []), [industries]);
  const initialKey = useMemo(() => defaultSelectedKey ?? list[0]?.key ?? "", [defaultSelectedKey, list]);
  const [activeKey, setActiveKey] = useState(initialKey);

  const [localRole, setLocalRole] = useState<string | null>(null);
  const effectiveSelectedRole = selectedRoleId ?? localRole;
  const effectiveOnSelect = onSelectRole ?? setLocalRole;

  const active = useMemo(() => list.find((i) => i.key === activeKey), [list, activeKey]);
  const overlappingGroups = useMemo(() => {
    if (!effectiveSelectedRole) return 0;
    if (!active?.groups?.length) return 0;
    return active.groups.reduce((count, group) => {
      return count + (group.roleItems?.some((r) => r.id === effectiveSelectedRole) ? 1 : 0);
    }, 0);
  }, [active, effectiveSelectedRole]);

  return (
    <section className={clsx("rounded-2xl border border-border bg-white p-5 shadow-card", className)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left panel */}
        <aside className="lg:col-span-4">
          <h2 className="text-2xl font-bold text-ink">Industries</h2>
          <p className="mt-1 text-sm text-ink-soft">{list.length} total</p>
          <ul className="mt-4 space-y-2">
            {list.map((it) => {
              const selected = it.key === activeKey;
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(it.key)}
                    className={clsx(
                      "w-full rounded-2xl border px-4 py-4 text-left transition",
                      selected
                        ? "border-transparent bg-primary text-ink-invert"
                        : "border-border bg-white text-ink hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{it.title}</div>
                        <div
                          className={clsx(
                            "mt-1 text-sm",
                            selected ? "text-ink-invert/80" : "text-ink-soft"
                          )}
                        >
                          {typeof it.groupCount === "number"
                            ? `${it.groupCount} occupation groups`
                            : ""}
                        </div>
                      </div>
                      {typeof it.groupCount === "number" && (
                        <span
                          className={clsx(
                            "ml-2 inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-sm font-semibold",
                            selected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {it.groupCount}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right panel */}
        <main className="lg:col-span-8">
          <h2 className="text-2xl font-bold text-ink">Occupation groups</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {typeof active?.groupCount === "number" ? `${active.groupCount} groups` : ""}
          </p>
          {overlappingGroups > 1 && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              The selected role belongs to multiple groups, so they are highlighted together.
            </div>
          )}

          <div className="mt-4 space-y-4">
            {active?.groups.map((g) => (
              <GroupCard
                key={g.id}
                g={g}
                expandHint={expandHint}
                collapseHint={collapseHint}
                selectedRoleId={effectiveSelectedRole}
                onSelectRole={effectiveOnSelect}
              />
            ))}

            {!active?.groups?.length && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-ink-soft">
                No groups for this industry.
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
