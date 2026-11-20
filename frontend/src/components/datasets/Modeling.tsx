
import { useState } from "react";
import type { FormEvent } from "react";

import { runDatasetModeling } from "../../api/datasets";

import type {
  ProfileColumn,
  ModelingTaskType,
  ModelingModelType,
} from "../../api/datasets";

interface ModelingProps {
  datasetId: number;
  targetColumn: string;
  columns: ProfileColumn[];
}

const regressionModels = [
  {
    value: "linear_regression",
    label: "Linear Regression",
  },
  {
    value: "ridge",
    label: "Ridge Regression",
  },
  {
    value: "xgboost",
    label: "XGBoost Regressor",
  },
];

const classificationModels = [
  {
    value: "logistic_regression",
    label: "Logistic Regression",
  },
  {
    value: "random_forest",
    label: "Random Forest",
  },
  {
    value: "xgboost",
    label: "XGBoost Classifier",
  },
];

const Modeling = ({
  datasetId,
  targetColumn,
  columns,
}: ModelingProps) => {
  const [taskType, setTaskType] =
    useState<ModelingTaskType>("regression");

  const [modelType, setModelType] =
    useState<ModelingModelType>("linear_regression");

  const [excludedFeatures, setExcludedFeatures] =
    useState<string[]>([]);

  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const availableModels =
    taskType === "regression"
      ? regressionModels
      : classificationModels;

  const handleTaskChange = (value: ModelingTaskType) => {
    setTaskType(value);

    setModelType(
      value === "regression"
        ? "linear_regression"
        : "logistic_regression",
    );

    setIsCompleted(false);
    setError(null);
  };

  const handleFeatureChange = (
    columnName: string,
    checked: boolean,
  ) => {
    setExcludedFeatures((previous) =>
      checked
        ? [...previous, columnName]
        : previous.filter((column) => column !== columnName),
    );

    setIsCompleted(false);
    setError(null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!targetColumn) {
      setError(
        "Przed rozpoczęciem modelowania wybierz zmienną docelową w Data Understanding.",
      );
      return;
    }

    setIsTraining(true);
    setError(null);
    setIsCompleted(false);

    try {
      await runDatasetModeling(datasetId, {
        task_type: taskType,
        model_type: modelType,
        excluded_features: excludedFeatures,
      });

      setIsCompleted(true);
    } catch (err: unknown) {
      const responseData = (
        err as {
          response?: {
            data?: Record<string, unknown>;
          };
        }
      ).response?.data;

      const message = responseData
        ? Object.values(responseData)
            .flat()
            .filter(
              (value): value is string =>
                typeof value === "string",
            )
            .join(" ")
        : null;

      setError(
        message || "Nie udało się przeprowadzić modelowania.",
      );
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900">
        Modeling
      </h2>

      <p className="mt-2 text-gray-600">
        Skonfiguruj zadanie i wybierz algorytm uczenia
        maszynowego.
      </p>

      {!targetColumn ? (
        <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          Najpierw wybierz zmienną docelową w etapie
          Data Understanding.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Zmienna docelowa */}

          <div className="rounded-lg border bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-700">
              Zmienna docelowa
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {targetColumn}
            </p>
          </div>

          {/* Rodzaj zadania */}

          <div>
            <label
              htmlFor="modeling-task"
              className="block text-sm font-medium text-gray-700"
            >
              Rodzaj zadania
            </label>

            <select
              id="modeling-task"
              value={taskType}
              onChange={(event) =>
                handleTaskChange(
                  event.target.value as ModelingTaskType,
                )
              }
              disabled={isTraining}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-md"
            >
              <option value="regression">Regresja</option>
              <option value="classification">Klasyfikacja</option>
            </select>
          </div>

          {/* Algorytm */}

          <div>
            <label
              htmlFor="modeling-algorithm"
              className="block text-sm font-medium text-gray-700"
            >
              Algorytm
            </label>

            <select
              id="modeling-algorithm"
              value={modelType}
              onChange={(event) => {
                setModelType(
                  event.target.value as ModelingModelType,
                );
                setIsCompleted(false);
                setError(null);
              }}
              disabled={isTraining}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-md"
            >
              {availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Wykluczanie kolumn */}

          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Zmienne wejściowe
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Wybierz kolumny, które nie będą wykorzystywane
              podczas trenowania modelu.
            </p>

            <div className="mt-3 divide-y rounded-lg border">
              {columns
                .filter((column) => column.name !== targetColumn)
                .map((column) => (
                  <label
                    key={column.name}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={excludedFeatures.includes(column.name)}
                      onChange={(event) =>
                        handleFeatureChange(
                          column.name,
                          event.target.checked,
                        )
                      }
                      disabled={isTraining}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />

                    <span className="text-sm text-gray-800">
                      {column.name}
                    </span>

                    <span className="ml-auto text-xs text-gray-400">
                      {column.semantic_type === "quantitative"
                        ? "Ilościowa"
                        : "Jakościowa"}
                    </span>
                  </label>
                ))}
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Wykluczono: {excludedFeatures.length} z{" "}
              {columns.filter(
                (column) => column.name !== targetColumn,
              ).length}{" "}
              kolumn.
            </p>
          </div>

          {/* Błędy */}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Sukces */}

          {isCompleted && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Model został pomyślnie wytrenowany.
            </div>
          )}

          {/* Uruchomienie */}

          <button
            type="submit"
            disabled={isTraining}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTraining
              ? "Trenowanie modelu..."
              : "Uruchom modelowanie"}
          </button>
        </form>
      )}
    </section>
  );
};

export default Modeling;
