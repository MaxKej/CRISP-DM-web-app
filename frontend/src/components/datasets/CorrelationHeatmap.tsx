
import { useEffect, useState } from "react";
import { getDatasetCorrelations } from "../../api/datasets";
import type { CorrelationMatrix } from "../../api/datasets";

interface CorrelationHeatmapProps {
  datasetId: number;
}

const getCellColor = (value: number | null): string => {
  if (value === null) {
    return "#e5e7eb";
  }

  const intensity = Math.abs(value);

  if (value > 0) {
    return `rgba(220, 38, 38, ${0.12 + intensity * 0.78})`;
  }

  if (value < 0) {
    return `rgba(37, 99, 235, ${0.12 + intensity * 0.78})`;
  }

  return "#f3f4f6";
};

const CorrelationHeatmap = ({
  datasetId,
}: CorrelationHeatmapProps) => {
  const [data, setData] = useState<CorrelationMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCorrelations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getDatasetCorrelations(datasetId);

        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setError("Nie udało się pobrać macierzy korelacji.");
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
  }, [datasetId]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5 text-gray-500">
        Obliczanie macierzy korelacji...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        {error}
      </div>
    );
  }

  if (!data || data.columns.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-5 text-gray-500">
        Brak zmiennych numerycznych do obliczenia korelacji.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Heatmapa korelacji
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Macierz zależności między zmiennymi ilościowymi i jakościowymi.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${data.columns.length + 1}, minmax(85px, 1fr))`,
            minWidth: `${(data.columns.length + 1) * 90}px`,
          }}
        >
          {/* Puste pole w lewym górnym rogu */}
          <div />

          {/* Nagłówki kolumn */}
          {data.columns.map((column) => (
            <div
              key={`header-${column}`}
              className="flex min-h-20 items-end justify-center break-all px-1 pb-2 text-center text-xs font-semibold text-gray-600"
            >
              {column}
            </div>
          ))}

          {/* Wiersze macierzy */}
          {data.matrix.map((row, rowIndex) => (
            <div
              key={`row-${data.columns[rowIndex]}`}
              className="contents"
            >
              <div className="flex min-h-16 items-center break-all pr-2 text-xs font-semibold text-gray-700">
                {data.columns[rowIndex]}
              </div>

              {row.map((value, columnIndex) => {
                const isMissing = value === null;

                return (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    title={`${data.columns[rowIndex]} – ${data.columns[columnIndex]}: ${
                      value === null ? "Brak danych" : value.toFixed(3)
                    }`}
                    className={`flex min-h-16 items-center justify-center rounded text-xs font-semibold ${
                      !isMissing && Math.abs(value) >= 0.55
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                    style={{
                      backgroundColor: getCellColor(value),
                    }}
                  >
                    {value === null ? "—" : value.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-blue-600" />
          Korelacja ujemna (Pearson)
        </div>

        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-gray-100" />
          Brak lub słaba zależność
        </div>

        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-red-600" />
          Dodatnia korelacja lub siła zależności
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
