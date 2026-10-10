import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getDatasetChart,
  type DistributionChartData,
} from "../../api/datasets";
import type { ProfileColumn } from "../../api/datasets";

interface DistributionChartProps {
  datasetId: number;
  columns: ProfileColumn[];
}

export default function DistributionChart({
  datasetId,
  columns,
}: DistributionChartProps) {
  const [selectedColumn, setSelectedColumn] = useState(
    columns[0]?.name ?? "",
  );
  const [chart, setChart] = useState<DistributionChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile = columns.find(
    (column) => column.name === selectedColumn,
  );

  useEffect(() => {
    if (!selectedColumn || !selectedProfile) {
      setChart(null);
      return;
    }

    let cancelled = false;

    const loadChart = async () => {
      setIsLoading(true);
      setError(null);
      setChart(null);

      const chartType =
        selectedProfile.semantic_type === "quantitative"
          ? "histogram"
          : "bar";

      try {
        const result = await getDatasetChart(
          datasetId,
          chartType,
          selectedColumn,
        );

        if (!cancelled) {
          setChart(result);
        }
      } catch {
        if (!cancelled) {
          setError("Nie udało się pobrać danych wykresu.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadChart();

    return () => {
      cancelled = true;
    };
  }, [datasetId, selectedColumn, selectedProfile]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Rozkład wartości
      </h2>

      <p className="mb-4 text-sm text-gray-500">
        Wybierz kolumnę, aby sprawdzić rozkład jej wartości.
      </p>

      <div className="mb-5 max-w-md">
        <label
          htmlFor="distribution-column"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Kolumna
        </label>

        <select
          id="distribution-column"
          value={selectedColumn}
          onChange={(event) => setSelectedColumn(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {columns.map((column) => (
            <option key={column.name} value={column.name}>
              {column.name} ({column.semantic_type === "quantitative"
                ? "ilościowa"
                : "jakościowa"})
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <p className="py-8 text-center text-sm text-gray-500">
          Ładowanie wykresu...
        </p>
      )}

      {error && (
        <p className="py-8 text-center text-sm text-red-600">{error}</p>
      )}

      {!isLoading && !error && chart && chart.data.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          Brak danych do wyświetlenia.
        </p>
      )}

      {!isLoading && !error && chart && chart.data.length > 0 && (
        <>
          <p className="mb-3 text-sm text-gray-600">
            {chart.type === "histogram"
              ? "Histogram — liczba obserwacji w poszczególnych przedziałach."
              : "Częstość występowania poszczególnych kategorii."}
          </p>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart.data}
                margin={{ top: 5, right: 15, bottom: 45, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey={chart.type === "histogram" ? "bin" : "category"}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={85}
                  tick={{ fontSize: 11 }}
                />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Liczba wystąpień"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}