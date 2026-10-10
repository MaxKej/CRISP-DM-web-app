import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ProfileColumn } from "../../api/datasets.ts";

interface MissingValuesChartProps {
  columns: ProfileColumn[];
}

export default function MissingValuesChart({
  columns,
}: MissingValuesChartProps) {
  const data = columns
    .filter((column) => column.missing_values > 0)
    .map((column) => ({
      name: column.name,
      missing: column.missing_values,
      percentage: column.missing_percentage,
    }))
    .sort((a, b) => b.missing - a.missing);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Brakujące wartości
      </h2>

      <p className="mb-4 text-sm text-gray-500">
        Liczba brakujących wartości w poszczególnych kolumnach.
      </p>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-green-700">
          Nie wykryto brakujących wartości.
        </p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 25, bottom: 5, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />

              <XAxis
                type="number"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12 }}
              />

              <Tooltip
                formatter={(value, _name, item) => [
                  `${value} (${Number(item.payload.percentage).toFixed(2)}%)`,
                  "Brakujące wartości",
                ]}
              />

              <Bar
                dataKey="missing"
                fill="#dc2626"
                name="Brakujące wartości"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}