import apiClient from "./client";
import type { Dataset } from "../types/dataset";

export const getProjectDatasets = async (
  projectId: number
): Promise<Dataset[]> => {
  const response = await apiClient.get<Dataset[]>(
    `datasets/?project=${projectId}`
  );

  return response.data;
};

export const createDataset = async (
  projectId: number,
  file: File
): Promise<Dataset> => {
  const formData = new FormData();

  formData.append(
    "project",
    String(projectId)
  );

  formData.append(
    "file",
    file
  );

  const response = await apiClient.post<Dataset>(
    "datasets/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const deleteDataset = async (
  datasetId: number
): Promise<void> => {
  await apiClient.delete(
    `datasets/${datasetId}/`
  );
};