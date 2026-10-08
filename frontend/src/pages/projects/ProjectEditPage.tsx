import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getProject,
  updateProject,
} from "../../api/projects";

import { useNotification } from "../../context/NotificationContext";
import type { Project } from "../../types/project";


const ProjectEditPage = () => {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const navigate = useNavigate();

  const {
    showNotification,
  } = useNotification();


  const [project, setProject] =
    useState<Project | null>(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");


  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);


  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        showNotification(
          "Nieprawidłowy identyfikator projektu.",
          "error"
        );

        navigate("/projects");

        return;
      }


      try {
        const data =
          await getProject(
            Number(projectId)
          );


        setProject(data);
        setName(data.name);
        setDescription(
          data.description
        );

      } catch {
        showNotification(
          "Nie udało się pobrać projektu.",
          "error"
        );

        navigate("/projects");

      } finally {
        setIsLoading(false);
      }
    };


    loadProject();
  }, [
    projectId,
    navigate,
    showNotification,
  ]);


  const handleSubmit = async (
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();


    if (!projectId) {
      return;
    }


    if (!name.trim()) {
      showNotification(
        "Nazwa projektu jest wymagana.",
        "error"
      );

      return;
    }


    setIsSaving(true);


    try {
      await updateProject(
        Number(projectId),
        {
          name: name.trim(),
          description:
            description.trim(),
        }
      );


      showNotification(
        "Projekt został zaktualizowany.",
        "success"
      );


      navigate(
        `/projects/${projectId}`
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
            : "Nie udało się zaktualizować projektu.",
          "error"
        );

      } else {
        showNotification(
          "Nie udało się połączyć z serwerem.",
          "error"
        );
      }

    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-3xl p-8">
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
      <div className="mx-auto max-w-3xl p-8">

        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/${project.id}`
              )
            }
            className="text-sm text-blue-600 hover:underline"
          >
            ← Powrót do projektu
          </button>
        </div>


        <h1 className="text-2xl font-bold">
          Edycja projektu
        </h1>

        <p className="mt-1 text-gray-600">
          Zmień dane projektu.
        </p>


        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-lg bg-white p-6 shadow"
        >

          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium"
            >
              Nazwa projektu
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              maxLength={200}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>


          <div className="mt-4">
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium"
            >
              Opis
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={5}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>


          <div className="mt-6 flex gap-3">

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving
                ? "Zapisywanie..."
                : "Zapisz zmiany"}
            </button>


            <button
              type="button"
              onClick={() =>
                navigate(
                  `/projects/${project.id}`
                )
              }
              className="rounded-md border px-4 py-2 hover:bg-gray-50"
            >
              Anuluj
            </button>

          </div>

        </form>

      </div>
    </main>
  );
};

export default ProjectEditPage;