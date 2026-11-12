
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
import type {
  TargetCorrelations,
  TargetCorrelationMethod,
} from "../../api/datasets";

interface TargetCorrelationChartProps {
  datasetId: number;
  targetColumn: string;
}

const getMethodLabel = (method: TargetCorrelationMethod): string => {
  switch (method) {
    case "pearson":
      return "Pearson";
    case "cramers_v":
      return "V Craméra";
    case "correlation_ratio":
      return "Eta";
  }
};

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
              "Nie udało się obliczyć zależności z targetem.",
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
        Obliczanie zależności z targetem...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Zależność z targetem
        </h3>

        <p className="mt-2 text-sm text-amber-700">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const validCorrelations = data.correlations
    .filter((item) => item.correlation !== null)
    .map((item) => ({
      ...item,
      correlation: item.correlation as number,
      strength: Math.abs(item.correlation as number),
    }))
    .sort((a, b) => b.strength - a.strength);

  const missingCount =
    data.correlations.length - validCorrelations.length;

  if (validCorrelations.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Zależność z targetem
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Nie znaleziono zmiennych, dla których można obliczyć
          zależność z wybranym targetem.
        </p>
      </div>
    );
  }

  const hasPearson = validCorrelations.some(
    (item) => item.method === "pearson",
  );

  const hasOtherMethods = validCorrelations.some(
    (item) => item.method !== "pearson",
  );

  const chartHeight = Math.max(
    280,
    validCorrelations.length * 45 + 50,
  );

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Zależność zmiennych z targetem
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Analiza zależności poszczególnych zmiennych od targetu:
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
              formatter={(_value, _name, props) => {
                const item = props.payload;

                return [
                  `${item.correlation.toFixed(3)} (${getMethodLabel(item.method)})`,
                  "Wartość",
                ];
              }}
              labelFormatter={(label) => `Zmienna: ${label}`}
            />

            <ReferenceLine
              x={0}
              stroke="#374151"
              strokeWidth={1.5}
            />

            <Bar
              dataKey="correlation"
              name="Zależność"
              fill="#2563eb"
              radius={[0, 4, 4, 0]}
              barSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-1 text-xs text-gray-600">
        {hasPearson && (
          <p>
            <strong>Pearson:</strong> od -1 do 1. Określa siłę
            i kierunek korelacji liniowej.
          </p>
        )}

        {hasOtherMethods && (
          <p>
            <strong>V Craméra i Eta:</strong> od 0 do 1.
            Określają siłę zależności, bez wskazywania jej kierunku.
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-gray-700">
          Zastosowane metody:
        </p>

        <div className="flex flex-wrap gap-2">
          {Array.from(
            new Set(validCorrelations.map((item) => item.method)),
          ).map((method) => (
            <span
              key={method}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
            >
              {getMethodLabel(method)}
            </span>
          ))}
        </div>
      </div>

      {missingCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Pominięto {missingCount}{" "}
          {missingCount === 1
            ? "zmienną"
            : missingCount < 5
              ? "zmienne"
              : "zmiennych"}{" "}
          z powodu braku możliwości obliczenia zależności.
        </p>
      )}
    </div>
  );
};

export default TargetCorrelationChart;
