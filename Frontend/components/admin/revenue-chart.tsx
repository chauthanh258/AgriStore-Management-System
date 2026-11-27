"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { revenueReport } from "../../data/admin-mock";
import type { RevenueReport } from "../../types/api";

export function RevenueChart({
  data = revenueReport.periods
}: {
  data?: RevenueReport["periods"];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4ece1" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value) => `${Number(value).toLocaleString("vi-VN")} đ`}
          />
          <Bar dataKey="revenue" fill="#006948" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
