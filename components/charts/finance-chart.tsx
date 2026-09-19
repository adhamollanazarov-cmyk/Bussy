"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCompactMoney, formatMoney, toNumber } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-store";

interface FinanceChartProps {
  revenue: number;
  expenses: number;
  netProfit: number;
  taxAmount?: number;
}

export function FinanceChart({ revenue, expenses, netProfit, taxAmount = 0 }: FinanceChartProps) {
  const { t } = useLanguage();
  const data = [
    {
      name: t.charts.metricsAxisLabel,
      revenue,
      expenses,
      tax: taxAmount,
      netProfit: Math.max(0, netProfit),
    },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => formatCompactMoney(val)}
          />
          <Tooltip
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
          <Bar dataKey="revenue" name={t.charts.revenue} fill="#0F172A" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name={t.charts.expenses} fill="#F43F5E" radius={[6, 6, 0, 0]} />
          <Bar dataKey="tax" name={t.charts.tax} fill="#F59E0B" radius={[6, 6, 0, 0]} />
          <Bar dataKey="netProfit" name={t.charts.netProfit} fill="#10B981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
