import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteProject,
  getProject,
} from "../../api/projects";

import {
  createDataset,
  deleteDataset,
  getProjectDatasets,
} from "../../api/datasets";

import { useNotification } from "../../context/NotificationContext";

import type { Project } from "../../types/project";
import type { Dataset } from "../../types/dataset";


const ProjectPage = () => {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const navigate = useNavigate();

  const {
    showNotification,
  } = useNotification();


  const [project, setProject] =
    useState<Project | null>(null);

  const [datasets, setDatasets] =
    useState<Dataset[]>([]);


  const [isLoading, setIsLoading] =
    useState(true);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isDeletingDataset, setIsDeletingDataset] =
    useState<number | null>(null);

  const [isDeletingProject, setIsDeletingProject] =
    useState(false);


  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);


  useEffect(() => {
    const loadData = async () => {
      if (!projectId) {
        showNotification(
          "Nieprawidłowy identyfikator projektu.",
          "error"
        );

        navigate("/projects");

        return;
      }


      try {
        const projectIdNumber =
          Number(projectId);

        const [
          projectData,
          datasetsData,
        ] = await Promise.all([
          getProject(projectIdNumber),
          getProjectDatasets(projectIdNumber),
        ]);


        setProject(projectData);
        setDatasets(datasetsData);

      } catch {
        showNotification(
          "Nie udało się pobrać danych projektu.",
          "error"
        );

        navigate("/projects");

      } finally {
        setIsLoading(false);
      }
    };


    loadData();
  }, [
    projectId,
    navigate,
    showNotification,
  ]);


  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] ?? null;

    setSelectedFile(file);
  };


  const handleUpload = async () => {
    if (!projectId) {
      return;
    }


    if (!selectedFile) {
      showNotification(
        "Wybierz plik datasetu.",
        "error"
      );

      return;
    }


    setIsUploading(true);


    try {
      const dataset =
        await createDataset(
          Number(projectId),
          selectedFile
        );


      setDatasets(
        (currentDatasets) => [
          dataset,
          ...currentDatasets,
        ]
      );


      setSelectedFile(null);


      const fileInput =
        document.getElementById(
          "dataset-file"
        ) as HTMLInputElement | null;


      if (fileInput) {
        fileInput.value = "";
      }


      showNotification(
        "Dataset został dodany.",
        "success"
      );

    } catch (error: any) {
      const data =
        error.response?.data;


      if (
        data &&
        typeof data === "object"
      ) {
        const messages =
          Object.entries(data).flatMap(
            ([, value]) => {
              if (Array.isArray(value)) {
                return value.map(
                  (message) =>
                    String(message)
                );
              }

              return [
                String(value),
              ];
            }
          );


        showNotification(
          messages.length > 0
            ? messages.join(" ")
            : "Nie udało się dodać datasetu.",
          "error"
        );

      } else {
        showNotification(
          "Nie udało się połączyć z serwerem.",
          "error"
        );
      }

    } finally {
      setIsUploading(false);
    }
  };


  const handleDeleteDataset = async (
    dataset: Dataset
  ) => {
    const confirmed =
      window.confirm(
        `Czy na pewno chcesz usunąć dataset „${dataset.name}”?`
      );


    if (!confirmed) {
      return;
    }


    setIsDeletingDataset(dataset.id);


    try {
      await deleteDataset(
        dataset.id
      );


      setDatasets(
        (currentDatasets) =>
          currentDatasets.filter(
            (currentDataset) =>
              currentDataset.id !== dataset.id
          )
      );


      showNotification(
        "Dataset został usunięty.",
        "success"
      );

    } catch {
      showNotification(
        "Nie udało się usunąć datasetu.",
        "error"
      );

    } finally {
      setIsDeletingDataset(null);
    }
  };


  const handleDeleteProject = async () => {
    if (!projectId || !project) {
      return;
    }


    const confirmed =
      window.confirm(
        `Czy na pewno chcesz usunąć projekt „${project.name}”? Wszystkie datasety należące do tego projektu również zostaną usunięte.`
      );


    if (!confirmed) {
      return;
    }


    setIsDeletingProject(true);


    try {
      await deleteProject(
        Number(projectId)
      );


      showNotification(
        "Projekt został usunięty.",
        "success"
      );


      navigate("/projects");

    } catch {
      showNotification(
        "Nie udało się usunąć projektu.",
        "error"
      );

    } finally {
      setIsDeletingProject(false);
    }
  };


  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <p className="text-gray-600">
            Ładowanie projektu...
          </p>
        </div>
      </main>
    );
  }


  if (!project) {
    return null;
  }


  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-8">

        <div className="mb-6">
          <Link
            to="/projects"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Powrót do projektów
          </Link>
        </div>


        <div className="rounded-lg bg-white p-8 shadow">

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

            <div>
              <h1 className="text-2xl font-bold">
                {project.name}
              </h1>


              {project.description && (
                <p className="mt-2 text-gray-600">
                  {project.description}
                </p>
              )}
            </div>


            <div className="flex gap-2">

              <Link
                to={`/projects/${project.id}/edit`}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Edytuj projekt
              </Link>


              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingProject
                  ? "Usuwanie..."
                  : "Usuń projekt"}
              </button>

            </div>

          </div>


          <div className="mt-8 border-t pt-6">

            <h2 className="text-lg font-semibold">
              Informacje o projekcie
            </h2>


            <dl className="mt-4 grid gap-4 md:grid-cols-3">

              <div>
                <dt className="text-sm text-gray-500">
                  ID projektu
                </dt>

                <dd className="mt-1 font-medium">
                  {project.id}
                </dd>
              </div>


              <div>
                <dt className="text-sm text-gray-500">
                  Utworzono
                </dt>

                <dd className="mt-1 font-medium">
                  {new Date(
                    project.created_at
                  ).toLocaleString("pl-PL")}
                </dd>
              </div>


              <div>
                <dt className="text-sm text-gray-500">
                  Ostatnia aktualizacja
                </dt>

                <dd className="mt-1 font-medium">
                  {new Date(
                    project.updated_at
                  ).toLocaleString("pl-PL")}
                </dd>
              </div>

            </dl>

          </div>


          <div className="mt-8 border-t pt-6">

            <div>
              <h2 className="text-lg font-semibold">
                Datasety
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Dodaj plik, aby rozpocząć analizę
                danych w ramach tego projektu.
              </p>
            </div>


            <div className="mt-6 rounded-lg border bg-gray-50 p-6">

              <h3 className="font-semibold">
                Dodaj dataset
              </h3>


              <div className="mt-4">

                <label
                  htmlFor="dataset-file"
                  className="mb-2 block text-sm font-medium"
                >
                  Plik datasetu
                </label>


                <input
                  id="dataset-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.ods"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="block w-full rounded-md border bg-white px-3 py-2 text-sm"
                />

              </div>


              <div className="mt-3 flex gap-2 text-sm text-gray-600">

                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-400 text-xs font-semibold"
                  title="Nazwa datasetu zostanie utworzona automatycznie na podstawie nazwy pliku, bez rozszerzenia."
                >
                  i
                </span>

                <p>
                  Nazwa datasetu zostanie utworzona
                  automatycznie na podstawie nazwy
                  pliku, bez rozszerzenia.
                </p>

              </div>


              {selectedFile && (
                <div className="mt-4 rounded-md bg-white p-4">

                  <p className="text-sm text-gray-500">
                    Wybrany plik
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedFile.name}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Nazwa datasetu
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedFile.name.replace(
                      /\.[^/.]+$/,
                      ""
                    )}
                  </p>

                </div>
              )}


              <div className="mt-5">

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={
                    isUploading ||
                    !selectedFile
                  }
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading
                    ? "Dodawanie..."
                    : "Dodaj dataset"}
                </button>

              </div>

            </div>


            <div className="mt-6">

              {datasets.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-gray-50 p-8 text-center">

                  <h3 className="font-semibold">
                    Brak datasetów
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Dodaj pierwszy plik, aby rozpocząć
                    pracę z projektem.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {datasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="flex flex-col gap-4 rounded-lg border bg-white p-5 md:flex-row md:items-center md:justify-between"
                    >

                      <div className="min-w-0">

                        <h3 className="font-semibold">
                          {dataset.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          Dodano{" "}
                          {new Date(
                            dataset.created_at
                          ).toLocaleString("pl-PL")}
                        </p>

                      </div>


                      <div className="flex shrink-0 gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/projects/${project.id}/datasets/${dataset.id}`
                            )
                          }
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                        >
                          Otwórz
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDataset(dataset)
                          }
                          disabled={
                            isDeletingDataset === dataset.id
                          }
                          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {isDeletingDataset === dataset.id
                            ? "Usuwanie..."
                            : "Usuń"}
                        </button>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </main>
  );
};

export default ProjectPage;