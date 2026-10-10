import { useEffect, useState } from "react";
import { getDatasetChart } from "../../api/datasets";
import type { ProfileColumn } from "../../api/datasets";
interface BoxplotData {
  column: string;
  count: number;
  q1: number;
  median: number;
  q3: number;
  whisker_min: number;
  whisker_max: number;
  outliers: number[];
  outliers_count: number;
}

interface BoxplotChartProps {
  datasetId: number;
  columns: ProfileColumn[];
}

function getNiceStep(range: number, targetTicks: number): number {
  if (!Number.isFinite(range) || range <= 0) {
    return 1;
  }

  const roughStep = range / (targetTicks - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  const niceMultiplier =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  return niceMultiplier * magnitude;
}

function getAxisBounds(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 1, step: 0.2 };
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataRange = dataMax - dataMin;

  // Przypadek, gdy wszystkie obserwacje mają tę samą wartość.
  if (dataRange === 0) {
    const padding = Math.max(Math.abs(dataMin) * 0.05, 1);
    const step = getNiceStep(padding * 2, 6);

    return {
      min: Math.floor((dataMin - padding) / step) * step,
      max: Math.ceil((dataMax + padding) / step) * step,
      step,
    };
  }

  const step = getNiceStep(dataRange, 6);

  // Zaokrąglenie granic do czytelnych wartości osi.
  let min = Math.floor(dataMin / step) * step;
  let max = Math.ceil(dataMax / step) * step;

  // Jeśli wszystkie dane są nieujemne, nie pokazuj
  // ujemnej części osi tylko z powodu zaokrąglenia.
  if (dataMin >= 0) {
    min = Math.max(0, min);
  }

  // Jeśli wszystkie dane są niedodatnie, analogicznie
  // nie pokazuj dodatniej części osi bez potrzeby.
  if (dataMax <= 0) {
    max = Math.min(0, max);
  }

  // Zabezpieczenie przed zerowym zakresem po zaokrągleniu.
  if (max <= min) {
    min = dataMin - step;
    max = dataMax + step;
  }

  return { min, max, step };
}

export default function BoxplotChart({
  datasetId,
  columns,
}: BoxplotChartProps) {
  const numericColumns = columns.filter(
    (column) => column.semantic_type === "quantitative",
  );

  const [selectedColumn, setSelectedColumn] = useState(
    numericColumns[0]?.name ?? "",
  );
  const [data, setData] = useState<BoxplotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!numericColumns.some((column) => column.name === selectedColumn)) {
      setSelectedColumn(numericColumns[0]?.name ?? "");
      setData(null);
      return;
    }

    let cancelled = false;

    async function loadBoxplot() {
      setLoading(true);
      setError("");

      try {
        const result = (await getDatasetChart(
          datasetId,
          "boxplot",
          selectedColumn,
        )) as BoxplotData;

        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError("Nie udało się pobrać danych boxplota.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (selectedColumn) {
      void loadBoxplot();
    } else {
      setData(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [datasetId, selectedColumn, columns]);

  if (numericColumns.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold">
          Wartości odstające — boxplot
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Brak kolumn ilościowych do wyświetlenia wykresu.
        </p>
      </section>
    );
  }

  const chartTop = 30;
  const chartBottom = 244;
  const chartCenter = 350;
  const chartWidth = 620;
  const chartHeight = 290;

  const allValues = data
    ? [
        data.whisker_min,
        data.q1,
        data.median,
        data.q3,
        data.whisker_max,
        ...data.outliers,
      ].filter(Number.isFinite)
    : [];

  const axis = getAxisBounds(allValues);
  const minValue = axis.min;
  const maxValue = axis.max;
  const range = maxValue - minValue || 1;

  const y = (value: number) =>
    chartBottom -
    ((value - minValue) / range) * (chartBottom - chartTop);

  const ticks: number[] = [];

  for (
    let tick = minValue, index = 0;
    tick <= maxValue + axis.step * 1e-8 && index < 100;
    tick += axis.step, index++
  ) {
    ticks.push(tick);
  }

  const formatValue = (value: number) =>
    Number(value.toPrecision(6)).toLocaleString("pl-PL", {
      maximumFractionDigits: 6,
    });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            Wartości odstające — boxplot
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Pudełko pokazuje środkowe 50% obserwacji.
          </p>
        </div>

        <select
          value={selectedColumn}
          onChange={(event) => setSelectedColumn(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Kolumna do wykresu pudełkowego"
        >
          {numericColumns.map((column) => (
            <option key={column.name} value={column.name}>
              {column.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">
          Ładowanie wykresu...
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {data && !loading && (
        <>
          <div className="mt-4 w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="mx-auto w-full max-w-2xl"
              role="img"
              aria-label={`Boxplot kolumny ${data.column}`}
            >
              {/* Siatka i etykiety osi wartości */}
              {ticks.map((tick) => {
                const tickY = y(tick);

                return (
                  <g key={tick}>
                    <line
                      x1={65}
                      x2={chartWidth - 20}
                      y1={tickY}
                      y2={tickY}
                      stroke="currentColor"
                      strokeOpacity={0.15}
                      strokeDasharray="4 4"
                    />

                    <text
                      x={55}
                      y={tickY + 4}
                      fontSize="11"
                      textAnchor="end"
                      fill="currentColor"
                    >
                      {formatValue(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Oś wartości */}
              <line
                x1={65}
                x2={65}
                y1={chartTop}
                y2={chartBottom}
                stroke="currentColor"
                strokeOpacity={0.4}
              />

              {/* Wąsy */}
              <line
                x1={chartCenter}
                x2={chartCenter}
                y1={y(data.whisker_min)}
                y2={y(data.whisker_max)}
                stroke="currentColor"
                strokeWidth="2"
              />

              {/* Końce wąsów */}
              {[data.whisker_min, data.whisker_max].map(
                (value, index) => (
                  <line
                    key={index}
                    x1={chartCenter - 35}
                    x2={chartCenter + 35}
                    y1={y(value)}
                    y2={y(value)}
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                ),
              )}

              {/* Pudełko: Q1–Q3 */}
              <rect
                x={chartCenter - 65}
                y={y(data.q3)}
                width="130"
                height={Math.max(2, y(data.q1) - y(data.q3))}
                fill="#bfdbfe"
                stroke="#2563eb"
                strokeWidth="2"
                rx="3"
              />

              {/* Mediana */}
              <line
                x1={chartCenter - 65}
                x2={chartCenter + 65}
                y1={y(data.median)}
                y2={y(data.median)}
                stroke="#1d4ed8"
                strokeWidth="3"
              />

              {/* Punkty odstające */}
              {data.outliers.map((value, index) => (
                <circle
                  key={`${value}-${index}`}
                  cx={chartCenter + ((index % 9) - 4) * 9}
                  cy={y(value)}
                  r="3.5"
                  fill="#dc2626"
                  opacity="0.8"
                >
                  <title>{formatValue(value)}</title>
                </circle>
              ))}

              <text
                x={12}
                y={16}
                fontSize="12"
                fill="currentColor"
              >
                Wartość
              </text>

              <text
                x={chartCenter}
                y={chartHeight - 10}
                fontSize="13"
                textAnchor="middle"
                fill="currentColor"
              >
                {data.column}
              </text>
            </svg>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p>
              <span className="text-gray-500">
                Liczba obserwacji:
              </span>{" "}
              <strong>{data.count}</strong>
            </p>

            <p>
              <span className="text-gray-500">Mediana:</span>{" "}
              <strong>{formatValue(data.median)}</strong>
            </p>

            <p>
              <span className="text-gray-500">
                Wartości odstające:
              </span>{" "}
              <strong>{data.outliers_count}</strong>
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Czerwone punkty oznaczają potencjalne wartości odstające
            według reguły 1,5 × IQR. Nie oznacza to automatycznie
            błędnych danych.
          </p>
        </>
      )}
    </section>
  );
}