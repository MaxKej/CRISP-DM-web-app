
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDatasetTargetCorrelations } from "../../api/datasets";
import type { TargetCorrelations } from "../../api/datasets";

interface TargetCorrelationChartProps {
  datasetId: number;
  targetColumn: string;
}

const TargetCorrelationChart = ({
  datasetId,
  targetColumn,
}: TargetCorrelationChartProps) => {
  const [data, setData] = useState<TargetCorrelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCorrelations = async () => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const result = await getDatasetTargetCorrelations(datasetId);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          const responseData = (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          ).response?.data;

          setError(
            responseData?.detail ??
              "Nie udało się obliczyć korelacji z targetem.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCorrelations();

    return () => {
      cancelled = true;
    };
  }, [datasetId, targetColumn]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5 text-gray-500">
        Obliczanie korelacji z targetem...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Korelacja z targetem
        </h3>

        <p className="mt-2 text-sm text-amber-700">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const validCorrelations = data.correlations
    .filter(
      (
        item,
      ): item is { column: string; correlation: number } =>
        item.correlation !== null,
    )
    .sort(
      (a, b) =>
        Math.abs(b.correlation) - Math.abs(a.correlation),
    );

  const missingCount =
    data.correlations.length - validCorrelations.length;

  if (validCorrelations.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Korelacja z targetem
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Nie znaleziono zmiennych, dla których można obliczyć
          korelację z wybranym targetem.
        </p>
      </div>
    );
  }

  const chartHeight = Math.max(
    280,
    validCorrelations.length * 45 + 50,
  );

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Korelacja zmiennych z targetem
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Zależność liniowa poszczególnych zmiennych od targetu:
          <span className="ml-1 font-medium text-gray-700">
            {data.target}
          </span>
        </p>
      </div>

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer>
          <BarChart
            data={validCorrelations}
            layout="vertical"
            margin={{
              top: 10,
              right: 30,
              bottom: 10,
              left: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tick={{ fontSize: 12 }}
            />

            <YAxis
              type="category"
              dataKey="column"
              width={120}
              tick={{ fontSize: 12 }}
            />

            <Tooltip
              formatter={(value) => [
                Number(value).toFixed(3),
                "Korelacja",
              ]}
              labelFormatter={(label) => `Zmienna: ${label}`}
            />

            <ReferenceLine
              x={0}
              stroke="#374151"
              strokeWidth={1.5}
            />

            <Bar
              dataKey="correlation"
              name="Korelacja"
              fill="#2563eb"
              radius={[0, 4, 4, 0]}
              barSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {missingCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Pominięto {missingCount}{" "}
          {missingCount === 1
            ? "zmienną"
            : missingCount < 5
              ? "zmienne"
              : "zmiennych"}{" "}
          z powodu braku możliwości obliczenia korelacji.
        </p>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Wartość bliska 1 oznacza silną dodatnią zależność liniową,
        a bliska -1 silną ujemną zależność liniową.
        Wartość bliska 0 oznacza słabą zależność liniową.
      </p>
    </div>
  );
};

export default TargetCorrelationChart;
