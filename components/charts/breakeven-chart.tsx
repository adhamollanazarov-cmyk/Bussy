"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { formatCompactMoney, formatMoney, toNumber } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-store";

interface BreakEvenChartProps {
  fixedCost: number;
  sellingPrice: number;
  variableCostPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
}

export function BreakEvenChart({
  fixedCost,
  sellingPrice,
  variableCostPerUnit,
  breakEvenUnits,
  breakEvenRevenue,
}: BreakEvenChartProps) {
  const { t, locale } = useLanguage();
  if (breakEvenUnits <= 0) return null;

  // 0 dan 1.8x break-even donagacha nuqtalar.
  // Zararsizlik nuqtasining o'zi ham nuqtalar ro'yxatiga qo'shiladi, aks holda
  // ReferenceDot chiziqqa tushmaydi.
  const maxUnits = Math.ceil(breakEvenUnits * 1.8);
  const step = Math.max(1, Math.floor(maxUnits / 6));

  const unitStops = new Set<number>();
  for (let u = 0; u <= maxUnits; u += step) unitStops.add(u);
  unitStops.add(breakEvenUnits);

  const points = [...unitStops]
    .sort((a, b) => a - b)
    .map((u) => ({
      unitCount: u,
      totalRevenue: u * sellingPrice,
      totalCost: fixedCost + u * variableCostPerUnit,
      fixedCostLine: fixedCost,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          {/* Raqamli o'q: ReferenceDot aniq qiymatga tushishi uchun shart */}
          <XAxis
            dataKey="unitCount"
            type="number"
            domain={[0, maxUnits]}
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val: number) =>
              `${val.toLocaleString(locale === "en" ? "en-US" : "ru-RU")} ${t.charts.unitsSuffix}`.trim()
            }
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => formatCompactMoney(val)}
          />
          <Tooltip
            labelFormatter={(val) =>
              `${toNumber(val).toLocaleString(locale === "en" ? "en-US" : "ru-RU")} ${t.charts.unitsSuffix}`.trim()
            }
            formatter={(value) => [formatMoney(toNumber(value)), ""]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
          <Line
            type="monotone"
            dataKey="totalRevenue"
            name={t.charts.totalRevenue}
            stroke="#10B981"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="totalCost"
            name={t.charts.totalCost}
            stroke="#F43F5E"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fixedCostLine"
            name={t.charts.fixedCost}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            dot={false}
          />
          {breakEvenUnits > 0 && (
            <ReferenceDot
              x={breakEvenUnits}
              y={breakEvenRevenue}
              r={6}
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth={2}
              label={{
                value: t.charts.breakEvenLabel,
                position: "top",
                fontSize: 11,
                fill: "#047857",
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
