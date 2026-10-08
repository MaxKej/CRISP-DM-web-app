import { useState } from "react";
import type { SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createProject } from "../../api/projects";
import { useNotification } from "../../context/NotificationContext";

const ProjectCreatePage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      showNotification(
        "Nazwa projektu jest wymagana.",
        "error"
      );

      return;
    }

    setIsSaving(true);

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
      });

      showNotification(
        "Projekt został utworzony.",
        "success"
      );

      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      const data = error.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data).flatMap(
          ([, value]) => {
            if (Array.isArray(value)) {
              return value.map((message) =>
                String(message)
              );
            }

            return [String(value)];
          }
        );

        showNotification(
          messages.length > 0
            ? messages.join(" ")
            : "Nie udało się utworzyć projektu.",
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

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">
          Nowy projekt
        </h1>

        <p className="mt-1 text-gray-600">
          Utwórz projekt analityczny.
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
                setName(event.target.value)
              }
              maxLength={200}
              required
              className="w-full rounded-md border px-3 py-2"
              placeholder="Np. Analiza sprzedaży"
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
                setDescription(event.target.value)
              }
              rows={5}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Opcjonalny opis projektu..."
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving
                ? "Tworzenie..."
                : "Utwórz projekt"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/projects")}
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

export default ProjectCreatePage;