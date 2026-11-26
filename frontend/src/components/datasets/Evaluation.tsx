import { memo, useEffect, useMemo, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// TYPES
// ============================================================

type TaskType = "regression" | "classification";

interface ModelingRun {
  id: number;
  task_type: TaskType;
  model_type: string;
  result: Record<string, unknown>;
}

interface EvaluationProps {
  runs: ModelingRun[];
}

interface ChartPoint {
  [key: string]: string | number | null;
}

type NumericPoint = Record<string, number>;

interface AxisScale {
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  width: number;
}

interface Metric {
  key: string;
  label: string;
  percentage?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

// Każdy punkt to osobny element SVG, więc ograniczamy ich liczbę.
const MAX_SCATTER_POINTS = 1000;
const MAX_LINE_POINTS = 500;

// ============================================================
// HELPERS
// ============================================================

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
};

const getRecord = (
  value: unknown,
): Record<string, unknown> => {
  return isRecord(value) ? value : {};
};

const getChartData = (value: unknown): ChartPoint[] => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    return [];
  }

  return value.data.filter(
    (item): item is ChartPoint => isRecord(item),
  );
};

const getNumber = (
  value: unknown,
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const formatNumber = (
  value: unknown,
  percentage = false,
): string => {
  const number = getNumber(value);

  if (number === null) {
    return "—";
  }

  if (percentage) {
    return `${(number * 100).toFixed(2)}%`;
  }

  return number.toFixed(4);
};

// Zamienia dane na liczby (także zapisane jako tekst)
// i pomija niekompletne punkty.
const getNumericData = (
  value: unknown,
  keys: string[],
): NumericPoint[] => {
  return getChartData(value).flatMap((item) => {
    const point: NumericPoint = {};

    for (const key of keys) {
      const raw = item[key];

      if (raw === null || raw === undefined || raw === "") {
        return [];
      }

      const number = Number(raw);

      if (!Number.isFinite(number)) {
        return [];
      }

      point[key] = number;
    }

    return [point];
  });
};

// Równomierne próbkowanie, które zachowuje pierwszy i ostatni
// punkt oraz wartości skrajne wskazanych kolumn.
const downsample = (
  data: NumericPoint[],
  limit: number,
  keys: string[],
): NumericPoint[] => {
  if (data.length <= limit) {
    return data;
  }

  const indexes = new Set<number>();

  for (const key of keys) {
    let minIndex = 0;
    let maxIndex = 0;

    for (let i = 1; i < data.length; i += 1) {
      if (data[i][key] < data[minIndex][key]) minIndex = i;
      if (data[i][key] > data[maxIndex][key]) maxIndex = i;
    }

    indexes.add(minIndex);
    indexes.add(maxIndex);
  }

  const sampleSize = limit - indexes.size;
  const step = (data.length - 1) / (sampleSize - 1);

  for (let i = 0; i < sampleSize; i += 1) {
    indexes.add(Math.round(i * step));
  }

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => data[index]);
};

const createFormatter = (
  step: number,
  maxAbs: number,
): ((value: number) => string) => {
  // Bardzo małe wartości: notacja naukowa.
  if (maxAbs > 0 && maxAbs < 1e-4) {
    return (value) => (value === 0 ? "0" : value.toExponential(1));
  }

  // Duże wartości: zapis skrócony, np. "tys." i "mln".
  if (maxAbs >= 1e5) {
    const digits =
      Math.floor(Math.log10(maxAbs)) -
      Math.floor(Math.log10(step)) +
      2;

    const formatter = new Intl.NumberFormat("pl-PL", {
      notation: "compact",
      maximumSignificantDigits: Math.min(Math.max(digits, 1), 15),
    });

    return (value) => formatter.format(value);
  }

  // Liczba miejsc po przecinku wynika z odstępu między znacznikami.
  let decimals = 0;

  while (decimals < 10) {
    const scaled = step * 10 ** decimals;

    if (Math.abs(scaled - Math.round(scaled)) <= scaled * 1e-6) {
      break;
    }

    decimals += 1;
  }

  const formatter = new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: decimals,
  });

  return (value) => formatter.format(value);
};

// Tworzy oś z "okrągłymi" granicami i znacznikami.
// Pętla zamiast Math.min(...values) działa także dla dużych tablic.
const getAxisScale = (
  data: NumericPoint[],
  keys: string[],
  includeZero = false,
): AxisScale => {
  let min = includeZero ? 0 : Infinity;
  let max = includeZero ? 0 : -Infinity;

  for (const point of data) {
    for (const key of keys) {
      if (point[key] < min) min = point[key];
      if (point[key] > max) max = point[key];
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }

  if (min === max) {
    const padding = Math.abs(min) * 0.05 || 1;
    min -= padding;
    max += padding;
  }

  const roughStep = (max - min) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  const multiplier =
    [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ??
    10;

  const step = multiplier * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const count = Math.round((end - start) / step);

  // toPrecision usuwa błędy typu 0.30000000000000004.
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Number((start + index * step).toPrecision(12)),
  );

  const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]];

  const format = createFormatter(
    step,
    Math.max(Math.abs(domain[0]), Math.abs(domain[1])),
  );

  const longestLabel = Math.max(
    ...ticks.map((tick) => format(tick).length),
  );

  // Miejsce na liczby oraz pionowy opis osi.
  const width = Math.max(60, longestLabel * 8 + 32);

  return { domain, ticks, format, width };
};

const formatTooltipValue = <T,>(value: T) =>
  typeof value === "number" ? value.toFixed(4) : value;

// Lekki punkt wykresu: tylko niezbędne atrybuty SVG.
const renderDot = (props: unknown) => {
  const { cx, cy, fill, fillOpacity } = props as {
    cx?: number;
    cy?: number;
    fill?: string;
    fillOpacity?: number;
  };

  if (cx === undefined || cy === undefined) {
    return <g />;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={2.5}
      fill={fill}
      fillOpacity={fillOpacity}
    />
  );
};

const modelLabels: Record<string, string> = {
  linear_regression: "Linear Regression",
  ridge: "Ridge Regression",
  lasso: "Lasso Regression",
  xgboost: "XGBoost",
  logistic_regression: "Logistic Regression",
  random_forest: "Random Forest",
};

const regressionMetrics: Metric[] = [
  { key: "mae", label: "MAE" },
  { key: "rmse", label: "RMSE" },
  { key: "r2", label: "R²" },
];

const classificationMetrics: Metric[] = [
  { key: "accuracy", label: "Accuracy", percentage: true },
  { key: "precision", label: "Precision", percentage: true },
  { key: "recall", label: "Recall", percentage: true },
  { key: "f1", label: "F1-score", percentage: true },
  { key: "roc_auc", label: "ROC AUC", percentage: true },
];

const getModelLabel = (modelType: string): string => {
  return modelLabels[modelType] ?? modelType;
};

// ============================================================
// REGRESSION CHARTS
// ============================================================

interface RegressionChartsProps {
  actualVsPredicted: unknown;
  residuals: unknown;
}

const SampleInfo = ({ shown, total }: { shown: number; total: number }) =>
  shown < total ? (
    <p className="mt-2 text-xs text-gray-500">
      Wyświetlono próbkę {shown.toLocaleString("pl-PL")} z{" "}
      {total.toLocaleString("pl-PL")} punktów.
    </p>
  ) : null;

// memo: wykresy nie renderują się ponownie, gdy dane się nie zmieniły.
const RegressionCharts = memo(function RegressionCharts({
  actualVsPredicted,
  residuals,
}: RegressionChartsProps) {
  const prediction = useMemo(() => {
    const keys = ["actual", "predicted"];
    const data = getNumericData(actualVsPredicted, keys);

    return {
      total: data.length,
      points: downsample(data, MAX_SCATTER_POINTS, keys),
      // Wspólna skala dla obu osi.
      scale: getAxisScale(data, keys),
    };
  }, [actualVsPredicted]);

  const residual = useMemo(() => {
    const keys = ["predicted", "residual"];
    const data = getNumericData(residuals, keys);

    return {
      total: data.length,
      points: downsample(data, MAX_SCATTER_POINTS, keys),
      xScale: getAxisScale(data, ["predicted"]),
      yScale: getAxisScale(data, ["residual"], true),
    };
  }, [residuals]);

  return (
    <>
      {/* Actual vs Predicted */}

      <div className="mt-8 rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-gray-900">
          Wartości rzeczywiste i przewidywane
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Porównanie wartości rzeczywistych zmiennej docelowej
          z wartościami przewidywanymi przez model.
          Linia przerywana przedstawia idealne przewidywania.
        </p>

        {prediction.total > 0 ? (
          <>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, bottom: 20, left: 10, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    type="number"
                    dataKey="actual"
                    name="Wartość rzeczywista"
                    domain={prediction.scale.domain}
                    ticks={prediction.scale.ticks}
                    tickFormatter={prediction.scale.format}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Wartość rzeczywista",
                      position: "insideBottom",
                      offset: -15,
                    }}
                  />

                  <YAxis
                    type="number"
                    dataKey="predicted"
                    name="Wartość przewidywana"
                    domain={prediction.scale.domain}
                    ticks={prediction.scale.ticks}
                    tickFormatter={prediction.scale.format}
                    tick={{ fontSize: 12 }}
                    width={prediction.scale.width}
                    label={{
                      value: "Wartość przewidywana",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                  />

                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={formatTooltipValue}
                    isAnimationActive={false}
                  />

                  <ReferenceLine
                    segment={[
                      {
                        x: prediction.scale.domain[0],
                        y: prediction.scale.domain[0],
                      },
                      {
                        x: prediction.scale.domain[1],
                        y: prediction.scale.domain[1],
                      },
                    ]}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />

                  <Scatter
                    name="Predykcje"
                    data={prediction.points}
                    fill="#2563eb"
                    fillOpacity={0.55}
                    shape={renderDot}
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <SampleInfo
              shown={prediction.points.length}
              total={prediction.total}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Brak danych do wyświetlenia wykresu.
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Wartości przewidywane
          </span>

          <span className="flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-red-600" />
            Idealne przewidywania
          </span>
        </div>
      </div>

      {/* Residuals */}

      <div className="mt-6 rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-gray-900">
          Wykres reszt
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Rozkład różnic pomiędzy wartościami rzeczywistymi
          i przewidywanymi w zależności od przewidywanej wartości.
          Linia przerywana oznacza zerową wartość reszty.
        </p>

        {residual.total > 0 ? (
          <>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, bottom: 20, left: 10, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    type="number"
                    dataKey="predicted"
                    name="Wartość przewidywana"
                    domain={residual.xScale.domain}
                    ticks={residual.xScale.ticks}
                    tickFormatter={residual.xScale.format}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Wartość przewidywana",
                      position: "insideBottom",
                      offset: -15,
                    }}
                  />

                  <YAxis
                    type="number"
                    dataKey="residual"
                    name="Reszta"
                    domain={residual.yScale.domain}
                    ticks={residual.yScale.ticks}
                    tickFormatter={residual.yScale.format}
                    tick={{ fontSize: 12 }}
                    width={residual.yScale.width}
                    label={{
                      value: "Reszta",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                  />

                  <Tooltip
                    formatter={formatTooltipValue}
                    isAnimationActive={false}
                  />

                  <ReferenceLine
                    y={0}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />

                  <Scatter
                    name="Reszty"
                    data={residual.points}
                    fill="#0891b2"
                    fillOpacity={0.55}
                    shape={renderDot}
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <SampleInfo
              shown={residual.points.length}
              total={residual.total}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Brak danych do wyświetlenia wykresu.
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-600" />
            Reszty modelu
          </span>

          <span className="flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-red-600" />
            Poziom zerowy
          </span>
        </div>
      </div>
    </>
  );
});

// ============================================================
// COMPONENT
// ============================================================

const Evaluation = ({ runs }: EvaluationProps) => {
  const latestRunId =
    runs.length > 0 ? runs[runs.length - 1].id : null;

  const [selectedRunId, setSelectedRunId] = useState<number | null>(
    latestRunId,
  );

  // Zmiana wyboru tylko po pojawieniu się nowego przebiegu,
  // a nie przy każdej nowej referencji tablicy runs.
  useEffect(() => {
    setSelectedRunId(latestRunId);
  }, [latestRunId]);

  const selectedRun =
    runs.find((run) => run.id === selectedRunId) ??
    runs[runs.length - 1];

  // Hooki muszą być wywołane przed wcześniejszym returnem.
  const rawCharts = selectedRun?.result.charts;

  const rocData = useMemo(
    () =>
      downsample(
        getNumericData(getRecord(rawCharts).roc_curve, ["fpr", "tpr"]),
        MAX_LINE_POINTS,
        ["fpr", "tpr"],
      ),
    [rawCharts],
  );

  const featureImportance = useMemo(
    () =>
      getChartData(getRecord(rawCharts).feature_importance)
        .sort((a, b) => {
          const first =
            typeof a.importance === "number" ? a.importance : 0;
          const second =
            typeof b.importance === "number" ? b.importance : 0;

          return Math.abs(second) - Math.abs(first);
        })
        .slice(0, 15),
    [rawCharts],
  );

  // Brak wytrenowanych modeli
  if (!selectedRun) {
    return (
      <section>
        <h2 className="text-xl font-semibold text-gray-900">
          Evaluation
        </h2>

        <p className="mt-2 text-gray-600">
          Nie ma jeszcze wyników modelowania do oceny.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700">
            Brak wytrenowanych modeli
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Przejdź do etapu Modeling i wytrenuj przynajmniej jeden
            model. Jego wyniki pojawią się tutaj.
          </p>
        </div>
      </section>
    );
  }

  const result = selectedRun.result;

  const metrics = getRecord(result.metrics);
  const charts = getRecord(result.charts);

  const isRegression = selectedRun.task_type === "regression";

  const confusionChart = getRecord(charts.confusion_matrix);
  const confusionMatrix = Array.isArray(confusionChart.matrix)
    ? confusionChart.matrix
    : [];

  const confusionLabels = Array.isArray(confusionChart.labels)
    ? confusionChart.labels.map(String)
    : [];

  const metricDefinitions = isRegression
    ? regressionMetrics
    : classificationMetrics;

  const usedFeatures = Array.isArray(result.used_features)
    ? result.used_features.map(String)
    : [];

  const excludedFeatures = Array.isArray(result.excluded_features)
    ? result.excluded_features.map(String)
    : [];

  const removedEmptyColumns = Array.isArray(
    result.removed_empty_columns,
  )
    ? result.removed_empty_columns.map(String)
    : [];

  const trainRows = getNumber(result.train_rows);
  const testRows = getNumber(result.test_rows);

  const removedTargetRows = getNumber(result.removed_target_rows);

  const maxConfusionValue = Math.max(
    1,
    ...confusionMatrix.flatMap((row) =>
      Array.isArray(row)
        ? row.map((value) =>
            typeof value === "number" ? value : 0,
          )
        : [],
    ),
  );

  return (
    <section>
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Evaluation
        </h2>

        <p className="mt-2 text-gray-600">
          Ocena jakości wytrenowanych modeli i porównanie uzyskanych
          wyników.
        </p>
      </div>

      {/* ================================================== */}
      {/* MODEL SELECTOR */}
      {/* ================================================== */}

      <div className="mt-6 rounded-lg border bg-gray-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              Wybrany model
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Liczba wytrenowanych modeli: {runs.length}
            </p>
          </div>

          <select
            value={selectedRun.id}
            onChange={(event) =>
              setSelectedRunId(Number(event.target.value))
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:min-w-64"
          >
            {runs.map((run, index) => (
              <option key={run.id} value={run.id}>
                {index + 1}. {getModelLabel(run.model_type)}
                {" — "}
                {run.task_type === "regression"
                  ? "Regresja"
                  : "Klasyfikacja"}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Algorytm</p>
            <p className="mt-1 font-medium text-gray-900">
              {getModelLabel(selectedRun.model_type)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Rodzaj zadania</p>
            <p className="mt-1 font-medium text-gray-900">
              {isRegression ? "Regresja" : "Klasyfikacja"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Zmienna docelowa</p>
            <p className="mt-1 font-medium text-gray-900">
              {String(result.target_column ?? "—")}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* METRICS */}
      {/* ================================================== */}

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900">
          Metryki oceny modelu
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Wartości obliczone na podstawie zbioru testowego.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metricDefinitions.map((metric) => (
            <div
              key={metric.key}
              className="rounded-lg border bg-white p-5"
            >
              <p className="text-sm text-gray-500">
                {metric.label}
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatNumber(
                  metrics[metric.key],
                  metric.percentage,
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================== */}
      {/* REGRESSION CHARTS */}
      {/* ================================================== */}

      {isRegression && (
        <RegressionCharts
          actualVsPredicted={charts.actual_vs_predicted}
          residuals={charts.residuals}
        />
      )}

      {/* ================================================== */}
      {/* CLASSIFICATION CHARTS */}
      {/* ================================================== */}

      {!isRegression && (
        <>
          {/* Confusion Matrix */}

          <div className="mt-8 rounded-lg border bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              Macierz pomyłek
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Zestawienie rzeczywistych i przewidywanych klas
              przez model klasyfikacyjny.
            </p>

            {confusionMatrix.length > 0 &&
            confusionLabels.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="mx-auto border-separate border-spacing-1 text-center text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-gray-500">
                        Rzeczywista / Przewidziana
                      </th>

                      {confusionLabels.map((label) => (
                        <th
                          key={label}
                          className="min-w-20 px-3 py-2 font-semibold text-gray-700"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {confusionMatrix.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="px-3 py-2 font-semibold text-gray-700">
                          {confusionLabels[rowIndex]}
                        </th>

                        {Array.isArray(row) &&
                          row.map((value, columnIndex) => {
                            const count =
                              typeof value === "number" ? value : 0;

                            const intensity = count / maxConfusionValue;

                            return (
                              <td
                                key={columnIndex}
                                className="min-w-20 rounded-md px-3 py-3 font-semibold text-gray-900"
                                style={{
                                  backgroundColor: `rgba(37, 99, 235, ${
                                    0.08 + intensity * 0.52
                                  })`,
                                }}
                              >
                                {count}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Brak danych do wyświetlenia macierzy pomyłek.
              </p>
            )}
          </div>

          {/* ROC Curve */}

          <div className="mt-6 rounded-lg border bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              Krzywa ROC
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Przedstawia zależność czułości (TPR) od odsetka
              fałszywie pozytywnych wyników (FPR).
              Linia przerywana przedstawia działanie klasyfikatora losowego.
            </p>

            {rocData.length > 0 ? (
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={rocData}
                    margin={{ bottom: 15, left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      type="number"
                      dataKey="fpr"
                      domain={[0, 1]}
                      label={{
                        value: "FPR",
                        position: "insideBottom",
                        offset: -10,
                      }}
                    />

                    <YAxis
                      type="number"
                      dataKey="tpr"
                      domain={[0, 1]}
                      label={{
                        value: "TPR",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />

                    <Tooltip
                      formatter={formatTooltipValue}
                      isAnimationActive={false}
                    />

                    <ReferenceLine
                      segment={[
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ]}
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />

                    <Line
                      type="linear"
                      dataKey="tpr"
                      name="Krzywa ROC"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Krzywa ROC nie jest dostępna dla tego modelu.
                Jest przygotowywana dla klasyfikacji binarnej.
              </p>
            )}

            {rocData.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-6 border-t-2 border-blue-600" />
                  Krzywa ROC
                </span>

                <span className="flex items-center gap-2">
                  <span className="w-6 border-t-2 border-dashed border-gray-400" />
                  Klasyfikator losowy
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================== */}
      {/* FEATURE IMPORTANCE */}
      {/* ================================================== */}

      <div className="mt-6 rounded-lg border bg-white p-5">
        <h3 className="font-semibold text-gray-900">
          Ważność cech
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Wpływ poszczególnych cech na działanie modelu.
        </p>

        {featureImportance.length > 0 ? (
          <div className="mt-4 h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportance}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis type="number" />

                <YAxis
                  type="category"
                  dataKey="feature"
                  width={130}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip
                  formatter={formatTooltipValue}
                  isAnimationActive={false}
                />

                <Bar
                  dataKey="importance"
                  name="Ważność"
                  fill="#2563eb"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Model nie udostępnia danych o ważności cech.
          </p>
        )}

        {isRecord(charts.feature_importance) && (
          <p className="mt-3 text-xs text-gray-500">
            Rodzaj prezentowanej wartości:{" "}
            {String(charts.feature_importance.type ?? "importance")}
          </p>
        )}
      </div>

      {/* ================================================== */}
      {/* DATA INFORMATION */}
      {/* ================================================== */}

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900">
          Informacje o modelowaniu
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Wiersze treningowe
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {trainRows?.toLocaleString("pl-PL") ?? "—"}
            </p>
          </div>

          <div className="rounded-lg border bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Wiersze testowe
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {testRows?.toLocaleString("pl-PL") ?? "—"}
            </p>
          </div>

          <div className="rounded-lg border bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Usunięte wiersze z brakującym targetem
            </p>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {removedTargetRows?.toLocaleString("pl-PL") ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-5">
            <h4 className="font-medium text-gray-900">
              Wykorzystane cechy
            </h4>

            {usedFeatures.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {usedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-md bg-green-50 px-3 py-1 text-sm text-green-800"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Brak informacji.
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-5">
            <h4 className="font-medium text-gray-900">
              Wykluczone cechy
            </h4>

            {excludedFeatures.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {excludedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-md bg-red-50 px-3 py-1 text-sm text-red-800"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Nie wykluczono żadnych cech.
              </p>
            )}
          </div>
        </div>

        {removedEmptyColumns.length > 0 && (
          <div className="mt-4 rounded-lg border bg-white p-5">
            <h4 className="font-medium text-gray-900">
              Usunięte puste kolumny
            </h4>

            <ul className="mt-3 flex flex-wrap gap-2">
              {removedEmptyColumns.map((column) => (
                <li
                  key={column}
                  className="rounded-md bg-yellow-50 px-3 py-1 text-sm text-yellow-800"
                >
                  {column}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* MODEL COMPARISON */}
      {/* ================================================== */}

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-900">
          Porównanie wytrenowanych modeli
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Zestawienie metryk wszystkich modeli uruchomionych
          w bieżącej sesji.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                  Model
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                  Zadanie
                </th>

                {regressionMetrics.map((metric) => (
                  <th
                    key={metric.key}
                    className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600"
                  >
                    {metric.label}
                  </th>
                ))}

                {classificationMetrics.map((metric) => (
                  <th
                    key={metric.key}
                    className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600"
                  >
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {runs.map((run) => {
                const runMetrics = getRecord(run.result.metrics);
                const runIsRegression =
                  run.task_type === "regression";

                return (
                  <tr
                    key={run.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      run.id === selectedRun.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {getModelLabel(run.model_type)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {runIsRegression ? "Regresja" : "Klasyfikacja"}
                    </td>

                    {regressionMetrics.map((metric) => (
                      <td
                        key={metric.key}
                        className="whitespace-nowrap px-4 py-3 text-gray-700"
                      >
                        {runIsRegression
                          ? formatNumber(runMetrics[metric.key])
                          : "—"}
                      </td>
                    ))}

                    {classificationMetrics.map((metric) => (
                      <td
                        key={metric.key}
                        className="whitespace-nowrap px-4 py-3 text-gray-700"
                      >
                        {!runIsRegression
                          ? formatNumber(
                              runMetrics[metric.key],
                              metric.percentage,
                            )
                          : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Kliknij wiersz tabeli, aby wyświetlić szczegółowe wyniki
          wybranego modelu.
        </p>
      </div>
    </section>
  );
};

export default Evaluation;
