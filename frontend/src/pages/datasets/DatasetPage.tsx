import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import apiClient from "../../api/client";
import { useNotification } from "../../context/NotificationContext";


interface NumericStatistics {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  std: number | null;
}


interface ProfileColumn {
  name: string;
  data_type: string;
  missing_values: number;
  missing_percentage: number;
  unique_values: number;
  statistics: NumericStatistics | null;
}


interface DatasetProfile {
  dataset_id: number;
  dataset_name: string;
  rows: number;
  columns_count: number;
  duplicate_rows: number;
  columns: ProfileColumn[];
}


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

  const [profile, setProfile] =
    useState<DatasetProfile | null>(null);

  const [activeStage, setActiveStage] =
    useState<Stage>("understanding");

  const [isLoading, setIsLoading] =
    useState(true);


  useEffect(() => {
    const loadProfile = async () => {
      if (!datasetId) {
        showNotification(
          "Nieprawidłowy identyfikator datasetu.",
          "error"
        );
        return;
      }

      try {
        const response =
          await apiClient.get<DatasetProfile>(
            `datasets/${datasetId}/profile/`
          );

        setProfile(response.data);
      } catch {
        showNotification(
          "Nie udało się pobrać informacji o datasecie.",
          "error"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [datasetId, showNotification]);


  const stages: {
    id: Stage;
    label: string;
  }[] = [
    {
      id: "understanding",
      label: "Data Understanding",
    },
    {
      id: "preparation",
      label: "Data Preparation",
    },
    {
      id: "modeling",
      label: "Modeling",
    },
    {
      id: "evaluation",
      label: "Evaluation",
    },
  ];


  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <p className="text-gray-600">
            Ładowanie datasetu...
          </p>
        </div>
      </main>
    );
  }


  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <p className="text-gray-600">
            Nie udało się pobrać datasetu.
          </p>
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
            <h1 className="text-2xl font-bold">
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
                  onClick={() =>
                    setActiveStage(stage.id)
                  }
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
                <h2 className="text-xl font-semibold">
                  Data Understanding
                </h2>

                <p className="mt-2 text-gray-600">
                  Podstawowe informacje o danych
                  znajdujących się w datasecie.
                </p>


                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Wiersze
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {profile.rows.toLocaleString("pl-PL")}
                    </p>
                  </div>


                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Kolumny
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {profile.columns_count}
                    </p>
                  </div>


                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Brakujące wartości
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {profile.columns.reduce(
                        (sum, column) =>
                          sum + column.missing_values,
                        0
                      ).toLocaleString("pl-PL")}
                    </p>
                  </div>


                  <div className="rounded-lg border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Duplikaty wierszy
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {profile.duplicate_rows.toLocaleString(
                        "pl-PL"
                      )}
                    </p>
                  </div>

                </div>


                <div className="mt-8">
                  <h3 className="text-lg font-semibold">
                    Informacje o kolumnach
                  </h3>


                  <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y">

                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">
                            Kolumna
                          </th>

                          <th className="px-4 py-3 text-left text-sm font-semibold">
                            Typ danych
                          </th>

                          <th className="px-4 py-3 text-left text-sm font-semibold">
                            Brakujące
                          </th>

                          <th className="px-4 py-3 text-left text-sm font-semibold">
                            % brakujących
                          </th>

                          <th className="px-4 py-3 text-left text-sm font-semibold">
                            Unikalne
                          </th>
                        </tr>
                      </thead>


                      <tbody className="divide-y bg-white">

                        {profile.columns.map(
                          (column) => (
                            <tr key={column.name}>

                              <td className="px-4 py-3 text-sm font-medium">
                                {column.name}
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600">
                                {column.data_type}
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600">
                                {column.missing_values.toLocaleString(
                                  "pl-PL"
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600">
                                {column.missing_percentage.toFixed(
                                  2
                                )}
                                %
                              </td>

                              <td className="px-4 py-3 text-sm text-gray-600">
                                {column.unique_values.toLocaleString(
                                  "pl-PL"
                                )}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>
                  </div>
                </div>

              </section>
            )}


            {activeStage === "preparation" && (
              <section>
                <h2 className="text-xl font-semibold">
                  Data Preparation
                </h2>

                <p className="mt-2 text-gray-600">
                  Przygotowanie danych będzie dostępne
                  w kolejnym etapie implementacji.
                </p>
              </section>
            )}


            {activeStage === "modeling" && (
              <section>
                <h2 className="text-xl font-semibold">
                  Modeling
                </h2>

                <p className="mt-2 text-gray-600">
                  Modelowanie danych będzie dostępne
                  w kolejnym etapie implementacji.
                </p>
              </section>
            )}


            {activeStage === "evaluation" && (
              <section>
                <h2 className="text-xl font-semibold">
                  Evaluation
                </h2>

                <p className="mt-2 text-gray-600">
                  Ewaluacja modeli będzie dostępna
                  w kolejnym etapie implementacji.
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