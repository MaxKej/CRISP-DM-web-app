from pathlib import Path
from typing import Any

import pandas as pd


def load_dataset(dataset) -> pd.DataFrame:
    """
    Wczytuje dataset do DataFrame na podstawie rozszerzenia pliku.
    """

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

    raise ValueError(
        "Nieobsługiwany format pliku."
    )


def profile_dataset(dataset) -> dict[str, Any]:
    """
    Tworzy podstawowy profil datasetu.

    Zwraca:
    - liczbę rekordów,
    - liczbę kolumn,
    - informacje o kolumnach,
    - liczbę duplikatów,
    - podstawowe statystyki.
    """

    dataframe = load_dataset(dataset)

    columns: list[dict[str, Any]] = []

    for column in dataframe.columns:
        series = dataframe[column]

        column_info: dict[str, Any] = {
            "name": str(column),
            "data_type": str(series.dtype),
            "missing_values": int(
                series.isna().sum()
            ),
            "missing_percentage": round(
                float(series.isna().mean() * 100),
                2,
            ),
            "unique_values": int(
                series.nunique(dropna=True)
            ),
            "statistics": None,
        }

        if pd.api.types.is_numeric_dtype(series):
            numeric_values = series.dropna()

            if not numeric_values.empty:
                column_info["statistics"] = {
                    "min": float(numeric_values.min()),
                    "max": float(numeric_values.max()),
                    "mean": round(
                        float(numeric_values.mean()),
                        4,
                    ),
                    "median": float(
                        numeric_values.median()
                    ),
                    "std": (
                        round(
                            float(numeric_values.std()),
                            4,
                        )
                        if len(numeric_values) > 1
                        else 0.0
                    ),
                }

        columns.append(column_info)

    return {
        "dataset_id": dataset.id,
        "dataset_name": dataset.name,
        "rows": int(dataframe.shape[0]),
        "columns_count": int(dataframe.shape[1]),
        "duplicate_rows": int(
            dataframe.duplicated().sum()
        ),
        "columns": columns,
    }