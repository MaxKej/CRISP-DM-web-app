import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useNotification } from "../../context/NotificationContext";
import MissingValuesChart from "../../components/datasets/MissingValuesChart";
import DistributionChart from "../../components/datasets/DistributionChart";
import ColumnTypeSelector from "../../components/datasets/ColumnTypeSelector";
import BoxplotChart from "../../components/datasets/BoxplotChart";

import {
  getDatasetProfile,
  getDatasetPreview,
  getDatasetColumnTypes,
} from "../../api/datasets";

import type {
  DatasetProfile,
  DatasetPreview,
  SemanticType,
} from "../../api/datasets";

type Stage =
  | "understanding"
  | "preparation"
  | "modeling"
  | "evaluation";

const DatasetPage = () => {
  const { projectId, datasetId } = useParams<{
    projectId: string;
    datasetId: string;
  }>();

  const { showNotification } = useNotification();

  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);

  const [typeOverrides, setTypeOverrides] = useState<
    Record<string, SemanticType>
  >({});

  const [activeStage, setActiveStage] =
    useState<Stage>("understanding");

  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setDataError(null);
      setProfile(null);
      setPreview(null);
      setTypeOverrides({});

      const id = Number(datasetId);

      if (
        !datasetId ||
        !Number.isInteger(id) ||
        id <= 0
      ) {
        setDataError("Nieprawidłowy identyfikator datasetu.");
        setIsLoading(false);
        return;
      }

      try {
        const [profileData, previewData, savedTypes] =
          await Promise.all([
            getDatasetProfile(id),
            getDatasetPreview(id),
            getDatasetColumnTypes(id),
          ]);

        if (cancelled) {
          return;
        }

        const overrides: Record<string, SemanticType> = {};

        savedTypes.forEach((item) => {
          overrides[item.column_name] = item.semantic_type;
        });

        // Stosujemy zapisane typy również po ponownym otwarciu strony.
        const updatedProfile: DatasetProfile = {
          ...profileData,
          columns: profileData.columns.map((column) => ({
            ...column,
            semantic_type:
              overrides[column.name] ?? column.semantic_type,
          })),
        };

        setProfile(updatedProfile);
        setPreview(previewData);
        setTypeOverrides(overrides);
      } catch {
        if (!cancelled) {
          setDataError(
            "Nie udało się pobrać profilu, podglądu lub typów kolumn.",
          );

          showNotification(
            "Nie udało się pobrać informacji o datasecie.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [datasetId, showNotification]);

  const handleColumnTypeUpdated = (
    columnName: string,
    type: SemanticType,
  ) => {
    setTypeOverrides((previous) => ({
      ...previous,
      [columnName]: type,
    }));

    setProfile((previous) =>
      previous
        ? {
            ...previous,
            columns: previous.columns.map((column) =>
              column.name === columnName
                ? { ...column, semantic_type: type }
                : column,
            ),
          }
        : previous,
    );

    showNotification(
      "Zapisano typ analityczny kolumny.",
      "success",
    );
  };

  const stages: { id: Stage; label: string }[] = [
    { id: "understanding", label: "Data Understanding" },
    { id: "preparation", label: "Data Preparation" },
    { id: "modeling", label: "Modeling" },
    { id: "evaluation", label: "Evaluation" },
  ];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <p className="text-gray-600">Ładowanie datasetu...</p>
        </div>
      </main>
    );
  }

  if (dataError || !profile) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <Link
            to={`/projects/${projectId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Powrót do projektu
          </Link>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
            {dataError ?? "Nie udało się pobrać datasetu."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-6">
          <Link
            to={`/projects/${projectId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Powrót do projektu
          </Link>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b px-8 pt-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.dataset_name}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Proces CRISP-DM
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    activeStage === stage.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeStage === "understanding" && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Understanding
                </h2>

                <p className="mt-2 text-gray-600">
                  Podstawowe informacje o danych znajdujących się
                  w datasecie.
                </p>

                {/* Podstawowe informacje o zbiorze */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">Wiersze</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {profile.rows.toLocaleString("pl-PL")}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">Kolumny</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {profile.columns_count.toLocaleString("pl-PL")}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Brakujące wartości
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {profile.columns
                        .reduce(
                          (sum, column) =>
                            sum + column.missing_values,
                          0,
                        )
                        .toLocaleString("pl-PL")}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Duplikaty wierszy
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {profile.duplicate_rows.toLocaleString("pl-PL")}
                    </p>
                  </div>
                </div>

                {/* Podgląd danych */}
                <div className="mt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Podgląd danych
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Pierwsze {preview?.preview_rows ?? 0} wierszy
                      zbioru danych.
                    </p>
                  </div>

                  {preview && preview.columns.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                              #
                            </th>

                            {preview.columns.map((column) => (
                              <th
                                key={column}
                                className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                          {preview.rows.map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="hover:bg-gray-50"
                            >
                              <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                                {rowIndex + 1}
                              </td>

                              {preview.columns.map((column) => {
                                const value = row[column];

                                return (
                                  <td
                                    key={column}
                                    className="max-w-xs whitespace-nowrap px-4 py-3 text-gray-700"
                                  >
                                    {value == null ? (
                                      <span className="italic text-gray-400">
                                        Brak danych
                                      </span>
                                    ) : typeof value === "object" ? (
                                      JSON.stringify(value)
                                    ) : (
                                      String(value)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border bg-gray-50 p-5 text-sm text-gray-500">
                      Zbiór nie zawiera wierszy do wyświetlenia.
                    </p>
                  )}
                </div>

                {/* Profil kolumn */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Profil kolumn
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Statystyki obliczone na podstawie całego zbioru.
                    Typ analityczny możesz zmienić dla każdej kolumny.
                  </p>

                  <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                            Kolumna
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                            Typ danych
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                            Typ analityczny
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                            Brakujące
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                            Unikalne
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-600">
                            Statystyki
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 bg-white">
                        {profile.columns.map((column) => (
                          <tr
                            key={column.name}
                            className="align-top hover:bg-gray-50"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                              {column.name}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {column.data_type}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              <ColumnTypeSelector
                                datasetId={Number(datasetId)}
                                columnName={column.name}
                                semanticType={
                                  typeOverrides[column.name] ??
                                  column.semantic_type
                                }
                                onUpdated={handleColumnTypeUpdated}
                              />
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {column.missing_values.toLocaleString("pl-PL")}
                              <span className="ml-1 text-gray-400">
                                ({column.missing_percentage.toFixed(2)}%)
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {column.unique_values.toLocaleString("pl-PL")}
                            </td>

                            <td className="min-w-56 px-4 py-3 text-gray-600">
                              {column.statistics == null ? (
                                <span className="text-gray-400">
                                  Brak statystyk
                                </span>
                              ) : "mean" in column.statistics ? (
                                <div className="space-y-1">
                                  <p>
                                    Średnia:{" "}
                                    {column.statistics.mean ?? "—"}
                                  </p>
                                  <p>
                                    Mediana:{" "}
                                    {column.statistics.median ?? "—"}
                                  </p>
                                  <p>
                                    Min–max:{" "}
                                    {column.statistics.min ?? "—"} –{" "}
                                    {column.statistics.max ?? "—"}
                                  </p>
                                  <p>
                                    Odchylenie standardowe:{" "}
                                    {column.statistics.std ?? "—"}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p>
                                    Dominanta:{" "}
                                    {column.statistics.most_frequent ?? "Brak"}
                                  </p>
                                  <p>
                                    Liczebność dominanty:{" "}
                                    {column.statistics.most_frequent_count}
                                  </p>

                                  {column.statistics.top_values.length > 0 && (
                                    <details className="pt-1">
                                      <summary className="cursor-pointer text-blue-700 hover:text-blue-800">
                                        Najczęstsze wartości
                                      </summary>

                                      <ul className="mt-2 space-y-1">
                                        {column.statistics.top_values.map(
                                          (item, index) => (
                                            <li
                                              key={`${item.value}-${index}`}
                                            >
                                              {item.value}: {item.count}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </details>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Wykres brakujących wartości */}
                <div className="mt-8">
                  <MissingValuesChart columns={profile.columns} />
                </div>

                {/* Rozkład wartości */}
                <div className="mt-8">
                  <DistributionChart
                    datasetId={Number(datasetId)}
                    columns={profile.columns}
                  />
                </div>
                {/* Wykres pudełkowy — wykrywanie wartości odstających */}
                <div className="mt-8">
                  <BoxplotChart
                    datasetId={Number(datasetId)}
                    columns={profile.columns}
                  />
                </div>
              </section>
            )}

            {activeStage === "preparation" && (
              <section>
                <h2 className="text-xl font-semibold">
                  Data Preparation
                </h2>
                <p className="mt-2 text-gray-600">
                  Przygotowanie danych będzie dostępne w kolejnym
                  etapie implementacji.
                </p>
              </section>
            )}

            {activeStage === "modeling" && (
              <section>
                <h2 className="text-xl font-semibold">Modeling</h2>
                <p className="mt-2 text-gray-600">
                  Modelowanie danych będzie dostępne w kolejnym
                  etapie implementacji.
                </p>
              </section>
            )}

            {activeStage === "evaluation" && (
              <section>
                <h2 className="text-xl font-semibold">Evaluation</h2>
                <p className="mt-2 text-gray-600">
                  Ewaluacja modeli będzie dostępna w kolejnym
                  etapie implementacji.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default DatasetPage;