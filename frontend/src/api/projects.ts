import apiClient from "./client";
import type { Project, ProjectData } from "../types/project";

export const getProjects = async (): Promise<Project[]> => {
  const response = await apiClient.get<Project[]>(
    "projects/"
  );

  return response.data;
};

export const getProject = async (
  projectId: number
): Promise<Project> => {
  const response = await apiClient.get<Project>(
    `projects/${projectId}/`
  );

  return response.data;
};

export const createProject = async (
  data: ProjectData
): Promise<Project> => {
  const response = await apiClient.post<Project>(
    "projects/",
    data
  );

  return response.data;
};

export const updateProject = async (
  projectId: number,
  data: ProjectData
): Promise<Project> => {
  const response = await apiClient.patch<Project>(
    `projects/${projectId}/`,
    data
  );

  return response.data;
};

export const deleteProject = async (
  projectId: number
): Promise<void> => {
  await apiClient.delete(
    `projects/${projectId}/`
  );
};