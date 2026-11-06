
import apiClient from "./client";
import type { Dataset } from "../types/dataset";

// ============================================================
// DATASETS
// ============================================================

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

  formData.append("project", String(projectId));
  formData.append("file", file);

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
  await apiClient.delete(`datasets/${datasetId}/`);
};

// ============================================================
// DATASET PROFILE
// ============================================================

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
  semantic_type: SemanticType;
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

// ============================================================
// CHARTS
// ============================================================

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

// ============================================================
// COLUMN TYPES
// ============================================================

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

// ============================================================
// TARGET VARIABLE
// ============================================================

export interface DatasetTarget {
  dataset_id: number;
  target_column: string | null;
}

export const getDatasetTarget = async (
  datasetId: number,
): Promise<DatasetTarget> => {
  const response = await apiClient.get<DatasetTarget>(
    `datasets/${datasetId}/target/`
  );

  return response.data;
};

export const updateDatasetTarget = async (
  datasetId: number,
  targetColumn: string,
): Promise<DatasetTarget> => {
  const response = await apiClient.put<DatasetTarget>(
    `datasets/${datasetId}/target/`,
    {
      target_column: targetColumn,
    }
  );

  return response.data;
};

// ============================================================
// CORRELATIONS
// ============================================================

export interface CorrelationMatrix {
  columns: string[];
  matrix: (number | null)[][];
}

export interface TargetCorrelation {
  column: string;
  correlation: number | null;
}

export interface TargetCorrelations {
  target: string;
  method: "pearson";
  correlations: TargetCorrelation[];
}

export const getDatasetCorrelations = async (
  datasetId: number,
): Promise<CorrelationMatrix> => {
  const response = await apiClient.get<CorrelationMatrix>(
    `datasets/${datasetId}/correlations/`
  );

  return response.data;
};

export const getDatasetTargetCorrelations = async (
  datasetId: number,
): Promise<TargetCorrelations> => {
  const response = await apiClient.get<TargetCorrelations>(
    `datasets/${datasetId}/target-correlations/`
  );

  return response.data;
};


// ============================================================
// DATA PREPARATION
// ============================================================

export interface PreparationSummary {
  type: string;
  [key: string]: unknown;
}

export interface PreparationResult {
  dataset_id: number;
  saved: boolean;
  columns: string[];
  rows: Record<string, unknown>[];
  preview_rows: number;
  summary: PreparationSummary;
}

export type MissingValueMethod = "mean" | "median" | "mode";

// Usuwanie kolumn
export const removeDatasetColumns = async (
  datasetId: number,
  columns: string[],
  save: boolean,
): Promise<PreparationResult> => {
  const response = await apiClient.post<PreparationResult>(
    `datasets/${datasetId}/preparation/remove-columns/`,
    { columns, save },
  );

  return response.data;
};

// Usuwanie całkowicie pustych wierszy
export const removeEmptyDatasetRows = async (
  datasetId: number,
  save: boolean,
): Promise<PreparationResult> => {
  const response = await apiClient.post<PreparationResult>(
    `datasets/${datasetId}/preparation/remove-empty-rows/`,
    { save },
  );

  return response.data;
};

// Usuwanie duplikatów
export const removeDuplicateDatasetRows = async (
  datasetId: number,
  save: boolean,
): Promise<PreparationResult> => {
  const response = await apiClient.post<PreparationResult>(
    `datasets/${datasetId}/preparation/remove-duplicates/`,
    { save },
  );

  return response.data;
};

// Uzupełnianie brakujących wartości
export const fillDatasetMissingValues = async (
  datasetId: number,
  methods: Record<string, MissingValueMethod>,
  save: boolean,
): Promise<PreparationResult> => {
  const response = await apiClient.post<PreparationResult>(
    `datasets/${datasetId}/preparation/fill-missing-values/`,
    { methods, save },
  );

  return response.data;
};

// Tworzenie zmiennej syntetycznej
export type SyntheticColumnOperator = "+" | "-" | "*" | "/";

export interface CreateSyntheticColumnPayload {
  name: string;
  left_column: string;
  operator: SyntheticColumnOperator;
  right_column: string;
  save: boolean;
}

export const createDatasetSyntheticColumn = async (
  datasetId: number,
  payload: CreateSyntheticColumnPayload,
): Promise<PreparationResult> => {
  const response = await apiClient.post<PreparationResult>(
    `datasets/${datasetId}/preparation/create-synthetic-column/`,
    payload,
  );

  return response.data;
};
