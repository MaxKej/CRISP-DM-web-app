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

export interface NumericStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
}

export interface QualitativeStatistics {
  most_frequent: string | null;
  most_frequent_count: number;
  top_values: {
    value: string;
    count: number;
  }[];
}

export interface ProfileColumn {
  name: string;
  data_type: string;
  semantic_type: "quantitative" | "qualitative";
  missing_values: number;
  missing_percentage: number;
  unique_values: number;
  statistics: NumericStatistics | QualitativeStatistics | null;
}

export interface DatasetColumnType {
  id: number;
  column_name: string;
  semantic_type: SemanticType;
}

export interface DatasetProfile {
  dataset_id: number;
  dataset_name: string;
  rows: number;
  columns_count: number;
  duplicate_rows: number;
  columns: ProfileColumn[];
}

export interface DatasetPreview {
  dataset_id: number;
  dataset_name: string;
  columns: string[];
  rows: Record<string, unknown>[];
  preview_rows: number;
}

export interface DistributionChartData {
  type: "histogram" | "bar";
  column: string;
  data: {
    bin?: string;
    category?: string;
    count: number;
  }[];
}

export interface BoxplotData {
  type: "boxplot";
  column: string;
  count: number;
  q1: number;
  median: number;
  q3: number;
  whisker_min: number;
  whisker_max: number;
  outliers: number[];
  outliers_count: number;
}

export const getDatasetProfile = async (
  datasetId: number
): Promise<DatasetProfile> => {
  const response = await apiClient.get<DatasetProfile>(
    `datasets/${datasetId}/profile/`
  );
  return response.data;
};

export const getDatasetPreview = async (
  datasetId: number
): Promise<DatasetPreview> => {
  const response = await apiClient.get<DatasetPreview>(
    `datasets/${datasetId}/preview/`
  );
  return response.data;
};

type ChartType = "histogram" | "bar" | "boxplot";
type DistributionChartType = "histogram" | "bar";

export function getDatasetChart(
  datasetId: number,
  type: DistributionChartType,
  column: string,
): Promise<DistributionChartData>;

export function getDatasetChart(
  datasetId: number,
  type: "boxplot",
  column: string,
): Promise<BoxplotData>;

export async function getDatasetChart(
  datasetId: number,
  type: ChartType,
  column: string,
): Promise<DistributionChartData | BoxplotData> {
  const response = await apiClient.get<
    DistributionChartData | BoxplotData
  >(`datasets/${datasetId}/chart/`, {
    params: {
      type,
      column,
    },
  });

  return response.data;
}

export type SemanticType = "quantitative" | "qualitative";

export const updateDatasetColumnType = async (
  datasetId: number,
  columnName: string,
  semanticType: SemanticType,
): Promise<DatasetColumnType> => {
  const response = await apiClient.put<DatasetColumnType>(
    `datasets/${datasetId}/column-types/${encodeURIComponent(columnName)}/`,
    {
      column_name: columnName,
      semantic_type: semanticType,
    },
  );

  return response.data;
};

export const getDatasetColumnTypes = async (
  datasetId: number,
): Promise<DatasetColumnType[]> => {
  const response = await apiClient.get<DatasetColumnType[]>(
    `datasets/${datasetId}/column-types/`,
  );

  return response.data;
};