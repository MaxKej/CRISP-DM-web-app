from pathlib import Path
from typing import Any

import pandas as pd

from .models import DatasetColumnType


def load_dataset(dataset) -> pd.DataFrame:
    """Wczytuje dataset do DataFrame na podstawie rozszerzenia pliku."""
    extension = Path(dataset.file.name).suffix.lower()
    file_path = dataset.file.path

    if extension == ".csv":
        return pd.read_csv(
            file_path,
            sep=None,
            engine="python",
        )

    if extension == ".xlsx":
        return pd.read_excel(
            file_path,
            engine="openpyxl",
        )

    if extension == ".xls":
        return pd.read_excel(
            file_path,
            engine="xlrd",
        )

    if extension == ".ods":
        return pd.read_excel(
            file_path,
            engine="odf",
        )

    raise ValueError("Nieobsługiwany format pliku.")


def profile_dataset(dataset) -> dict[str, Any]:
    """Zwraca podstawowe informacje i statystyki datasetu."""

    dataframe = load_dataset(dataset)

    # Pobieramy ręcznie ustawione typy dla tego zbioru.
    saved_types = {
        item.column_name: item.semantic_type
        for item in DatasetColumnType.objects.filter(dataset=dataset)
    }

    columns: list[dict[str, Any]] = []

    for column in dataframe.columns:
        column_name = str(column)
        series = dataframe[column]
        non_missing = series.dropna()

        # Domyślna klasyfikacja na podstawie typu technicznego.
        default_type = (
            "quantitative"
            if pd.api.types.is_numeric_dtype(series)
            else "qualitative"
        )

        # Ręczny wybór użytkownika ma pierwszeństwo.
        semantic_type = saved_types.get(column_name, default_type)

        column_info: dict[str, Any] = {
            "name": column_name,
            "data_type": str(series.dtype),
            "semantic_type": semantic_type,
            "missing_values": int(series.isna().sum()),
            "missing_percentage": round(
                float(series.isna().mean() * 100),
                2,
            ),
            "unique_values": int(series.nunique(dropna=True)),
            "statistics": None,
        }

        if semantic_type == "quantitative":
            # Próba interpretacji wartości jako liczb.
            values = pd.to_numeric(
                non_missing,
                errors="coerce",
            ).dropna()

            if not values.empty:
                column_info["statistics"] = {
                    "min": float(values.min()),
                    "max": float(values.max()),
                    "mean": round(float(values.mean()), 4),
                    "median": float(values.median()),
                    "std": (
                        round(float(values.std()), 4)
                        if len(values) > 1
                        else 0.0
                    ),
                }

        elif semantic_type == "qualitative":
            value_counts = series.value_counts(dropna=True)

            column_info["statistics"] = {
                "most_frequent": (
                    str(value_counts.index[0])
                    if not value_counts.empty
                    else None
                ),
                "most_frequent_count": (
                    int(value_counts.iloc[0])
                    if not value_counts.empty
                    else 0
                ),
                "top_values": [
                    {
                        "value": str(value),
                        "count": int(count),
                    }
                    for value, count in value_counts.head(10).items()
                ],
            }

        columns.append(column_info)

    return {
        "dataset_id": dataset.id,
        "dataset_name": dataset.name,
        "rows": int(dataframe.shape[0]),
        "columns_count": int(dataframe.shape[1]),
        "duplicate_rows": int(dataframe.duplicated().sum()),
        "columns": columns,
    }

def get_boxplot_data(df: pd.DataFrame, column_name: str) -> dict[str, Any]:
    if column_name not in df.columns:
        raise ValueError("Nie znaleziono wskazanej kolumny.")

    values = pd.to_numeric(df[column_name], errors="coerce").dropna()

    if values.empty:
        raise ValueError("Kolumna nie zawiera danych liczbowych.")

    q1 = float(values.quantile(0.25))
    median = float(values.quantile(0.50))
    q3 = float(values.quantile(0.75))
    iqr = q3 - q1

    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr

    inlier_values = values[
        (values >= lower_fence) & (values <= upper_fence)
    ]

    outliers = values[
        (values < lower_fence) | (values > upper_fence)
    ]

    return {
        "column": column_name,
        "count": int(len(values)),
        "q1": q1,
        "median": median,
        "q3": q3,
        "whisker_min": float(inlier_values.min()),
        "whisker_max": float(inlier_values.max()),
        "outliers": [float(value) for value in outliers.tolist()],
        "outliers_count": int(len(outliers)),
    }