import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProjects } from "../../api/projects";
import { useNotification } from "../../context/NotificationContext";
import type { Project } from "../../types/project";

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { showNotification } = useNotification();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch {
        showNotification(
          "Nie udało się pobrać projektów.",
          "error"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [showNotification]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-7xl p-8">
          <h1 className="text-2xl font-bold">
            Projekty
          </h1>

          <p className="mt-4 text-gray-600">
            Ładowanie projektów...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Projekty
            </h1>

            <p className="mt-1 text-gray-600">
              Zarządzaj swoimi projektami analitycznymi.
            </p>
          </div>

          <Link
            to="/projects/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Nowy projekt
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h2 className="text-lg font-semibold">
              Brak projektów
            </h2>

            <p className="mt-2 text-gray-600">
              Utwórz pierwszy projekt analityczny.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg bg-white p-6 shadow"
              >
                <h2 className="text-lg font-semibold">
                  {project.name}
                </h2>

                {project.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {project.description}
                  </p>
                )}

                <div className="mt-6">
                  <Link
                    to={`/projects/${project.id}`}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Otwórz
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ProjectsPage;