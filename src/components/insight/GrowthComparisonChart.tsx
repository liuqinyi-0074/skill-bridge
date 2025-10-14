// src/components/insight/GrowthComparisonChart.tsx
// Bar chart comparing growth rates across categories.
// Extended: accepts an optional "compare occupation" series.
// Uses Recharts.

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface GrowthComparisonChartProps {
  /** Growth rate for the selected occupation (percentage) */
  selectedOccupationRate?: number;
  /** Label for the selected occupation */
  selectedOccupationLabel?: string;
  /** Average growth rate for related occupations (percentage) */
  relatedOccupationsRate?: number;
  /** National average growth rate (percentage) */
  nationalAverageRate?: number;

  /** OPTIONAL: growth rate for the compared occupation (percentage) */
  compareOccupationRate?: number;
  /** OPTIONAL: label for the compared occupation */
  compareOccupationLabel?: string;

  /** Optional CSS class for the root element */
  className?: string;
}

export default function GrowthComparisonChart({
  selectedOccupationRate,
  selectedOccupationLabel = "Selected Occupation",
  relatedOccupationsRate,
  nationalAverageRate,
  compareOccupationRate,
  compareOccupationLabel = "Compared Occupation",
  className = "",
}: GrowthComparisonChartProps): React.ReactElement {
  // Prepare base rows
  const rows: Array<{ name: string; rate?: number; hasData: boolean }> = [
    { name: "National Average", rate: nationalAverageRate, hasData: nationalAverageRate != null },
    { name: "Related Occupations", rate: relatedOccupationsRate, hasData: relatedOccupationsRate != null },
    { name: selectedOccupationLabel, rate: selectedOccupationRate, hasData: selectedOccupationRate != null },
  ];

  // Optionally add compare row to the end so it displays as the topmost bar
  if (compareOccupationRate != null) {
    rows.push({
      name: compareOccupationLabel,
      rate: compareOccupationRate,
      hasData: true,
    });
  }

  // Normalize for chart
  const chartData = rows.map((r) => ({
    name: r.name,
    rate: r.rate ?? 0,
    hasData: r.hasData,
  }));

  const hasAnyData = chartData.some((d) => d.hasData);

  // Color palette (extend with a distinct color for compare)
  const colors = ["#A9BDD9", "#89A4C7", "#5E75A4", "#2D3748"]; // last one for compare

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { name: string; rate: number; hasData: boolean } }>;
  }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      if (!data.hasData) {
        return (
          <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-card">
            <p className="text-sm text-ink-soft">No data available</p>
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-card">
          <p className="mb-1 text-sm font-medium text-ink">{data.name}</p>
          <p className="text-sm text-ink-soft">
            Growth Rate: <span className="font-semibold text-primary">{data.rate.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => `${value}%`;

  if (!hasAnyData) {
    return (
      <div className={`rounded-xl border border-border bg-white p-6 shadow-card ${className}`}>
        <h3 className="mb-4 text-lg font-heading font-bold text-ink">Growth Rate Comparison</h3>
        <div className="flex items-center justify-center py-12">
          <p className="text-center text-ink-soft">No growth rate data available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-white p-6 shadow-card ${className}`}>
      <h3 className="mb-6 text-lg font-heading font-bold text-ink">Growth Rate Comparison</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatYAxis} stroke="#64748b" style={{ fontSize: "0.875rem" }} />
          <YAxis type="category" dataKey="name" width={180} stroke="#64748b" style={{ fontSize: "0.875rem" }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.hasData ? colors[index] ?? colors[colors.length - 1] : "#e2e8f0"} opacity={entry.hasData ? 1 : 0.5} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: colors[2] }} aria-hidden="true" />
            <span className="text-ink-soft">{selectedOccupationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: colors[1] }} aria-hidden="true" />
            <span className="text-ink-soft">Related Occupations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: colors[0] }} aria-hidden="true" />
            <span className="text-ink-soft">National Average</span>
          </div>
          {compareOccupationRate != null && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded" style={{ backgroundColor: colors[3] }} aria-hidden="true" />
              <span className="text-ink-soft">{compareOccupationLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
