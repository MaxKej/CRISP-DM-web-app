from pathlib import Path
from typing import Any

import pandas as pd
import math

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

    dataframe = load_prepared_dataset(dataset)

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

def load_prepared_dataset(dataset) -> pd.DataFrame:
    """Wczytuje przygotowany zbiór lub oryginalny plik."""
    if dataset.prepared_file:
        return load_dataset_file(dataset.prepared_file.path)

    return load_dataset(dataset)

def load_dataset_file(file_path: str) -> pd.DataFrame:
    """Wczytuje plik CSV, XLSX, XLS lub ODS."""
    extension = Path(file_path).suffix.lower()

    if extension == ".csv":
        dataframe = pd.read_csv(
            file_path,
            sep=None,
            engine="python",
            encoding="utf-8-sig",
        )
    elif extension == ".xlsx":
        dataframe = pd.read_excel(file_path, engine="openpyxl")
    elif extension == ".xls":
        dataframe = pd.read_excel(file_path, engine="xlrd")
    elif extension == ".ods":
        dataframe = pd.read_excel(file_path, engine="odf")
    else:
        raise ValueError("Nieobsługiwany format pliku.")

    dataframe.columns = [
        str(column).replace("\ufeff", "").strip()
        for column in dataframe.columns
    ]

    return dataframe


def load_dataset(dataset) -> pd.DataFrame:
    """Wczytuje oryginalny plik datasetu."""
    return load_dataset_file(dataset.file.path)


def load_prepared_dataset(dataset) -> pd.DataFrame:
    """Wczytuje przygotowany zbiór lub oryginalny plik."""
    if dataset.prepared_file:
        return load_dataset_file(dataset.prepared_file.path)

    return load_dataset(dataset)


def get_correlation_matrix(dataset) -> dict:
    """Zwraca macierz zależności dla zmiennych ilościowych i jakościowych."""

    dataframe = load_prepared_dataset(dataset)

    if dataframe.empty or len(dataframe.columns) == 0:
        raise ValueError("Zbiór danych jest pusty.")

    saved_types = {
        item.column_name: item.semantic_type
        for item in DatasetColumnType.objects.filter(dataset=dataset)
        if item.column_name in dataframe.columns
    }

    columns = [str(column) for column in dataframe.columns]

    semantic_types = {}

    for column in dataframe.columns:
        semantic_types[str(column)] = saved_types.get(
            str(column),
            (
                "quantitative"
                if pd.api.types.is_numeric_dtype(dataframe[column])
                else "qualitative"
            ),
        )

    def cramers_v(left: pd.Series, right: pd.Series):
        """Oblicza współczynnik V Craméra dla dwóch zmiennych jakościowych."""

        valid = pd.DataFrame({
            "left": left,
            "right": right,
        }).dropna()

        if len(valid) < 2:
            return None

        table = pd.crosstab(valid["left"], valid["right"])

        rows, columns_count = table.shape

        if rows < 2 or columns_count < 2:
            return None

        n = table.to_numpy().sum()

        row_totals = table.sum(axis=1)
        column_totals = table.sum(axis=0)

        chi_square = 0.0

        for i in range(rows):
            for j in range(columns_count):
                expected = (
                    row_totals.iloc[i] * column_totals.iloc[j] / n
                )

                if expected > 0:
                    observed = table.iloc[i, j]
                    chi_square += (observed - expected) ** 2 / expected

        denominator = n * min(rows - 1, columns_count - 1)

        if denominator == 0:
            return None

        return math.sqrt(chi_square / denominator)

    def correlation_ratio(
        qualitative: pd.Series,
        quantitative: pd.Series,
    ):
        """Oblicza współczynnik eta dla zmiennej jakościowej i ilościowej."""

        values = pd.DataFrame({
            "category": qualitative,
            "value": pd.to_numeric(quantitative, errors="coerce"),
        }).dropna()

        if len(values) < 2:
            return None

        grand_mean = values["value"].mean()

        total_sum = (
            (values["value"] - grand_mean) ** 2
        ).sum()

        if total_sum == 0:
            return None

        between_sum = 0.0

        for _, group in values.groupby("category", observed=True):
            between_sum += (
                len(group) * (group["value"].mean() - grand_mean) ** 2
            )

        return math.sqrt(between_sum / total_sum)

    matrix = []

    for left_column in dataframe.columns:
        row = []

        for right_column in dataframe.columns:

            if left_column == right_column:
                value = 1.0

            else:
                left_type = semantic_types[str(left_column)]
                right_type = semantic_types[str(right_column)]

                left = dataframe[left_column]
                right = dataframe[right_column]

                if (
                    left_type == "quantitative"
                    and right_type == "quantitative"
                ):
                    left_numeric = pd.to_numeric(left, errors="coerce")
                    right_numeric = pd.to_numeric(right, errors="coerce")

                    valid = pd.DataFrame({
                        "left": left_numeric,
                        "right": right_numeric,
                    }).dropna()

                    if len(valid) < 2:
                        value = None
                    else:
                        correlation = valid["left"].corr(
                            valid["right"],
                            method="pearson",
                        )

                        value = (
                            None
                            if pd.isna(correlation)
                            else float(correlation)
                        )

                elif (
                    left_type == "qualitative"
                    and right_type == "qualitative"
                ):
                    value = cramers_v(left, right)

                elif left_type == "qualitative":
                    value = correlation_ratio(left, right)

                else:
                    value = correlation_ratio(right, left)

                if value is not None:
                    value = float(value)

            row.append(value)

        matrix.append(row)

    return {
        "columns": columns,
        "matrix": matrix,
    }


def get_target_correlations(dataset) -> dict:
    """Oblicza zależności między zmienną celu a pozostałymi kolumnami."""

    dataframe = load_prepared_dataset(dataset)

    target_column = dataset.target_column

    if not target_column:
        raise ValueError("Nie wybrano zmiennej celu.")

    if target_column not in dataframe.columns:
        raise ValueError("Wybrana zmienna celu nie istnieje w zbiorze danych.")

    saved_types = {
        item.column_name: item.semantic_type
        for item in DatasetColumnType.objects.filter(dataset=dataset)
        if item.column_name in dataframe.columns
    }

    def get_semantic_type(column):
        return saved_types.get(
            str(column),
            (
                "quantitative"
                if pd.api.types.is_numeric_dtype(dataframe[column])
                else "qualitative"
            ),
        )

    def cramers_v(left, right):
        valid = pd.DataFrame({
            "left": left,
            "right": right,
        }).dropna()

        if len(valid) < 2:
            return None

        table = pd.crosstab(valid["left"], valid["right"])

        rows, columns = table.shape

        if rows < 2 or columns < 2:
            return None

        n = table.to_numpy().sum()

        row_totals = table.sum(axis=1)
        column_totals = table.sum(axis=0)

        chi_square = 0.0

        for i in range(rows):
            for j in range(columns):
                expected = (
                    row_totals.iloc[i] * column_totals.iloc[j] / n
                )

                if expected > 0:
                    observed = table.iloc[i, j]
                    chi_square += (observed - expected) ** 2 / expected

        denominator = n * min(rows - 1, columns - 1)

        if denominator == 0:
            return None

        return math.sqrt(chi_square / denominator)

    def correlation_ratio(qualitative, quantitative):
        values = pd.DataFrame({
            "category": qualitative,
            "value": pd.to_numeric(quantitative, errors="coerce"),
        }).dropna()

        if len(values) < 2:
            return None

        grand_mean = values["value"].mean()

        total_sum = (
            (values["value"] - grand_mean) ** 2
        ).sum()

        if total_sum == 0:
            return None

        between_sum = 0.0

        for _, group in values.groupby("category", observed=True):
            between_sum += (
                len(group) * (group["value"].mean() - grand_mean) ** 2
            )

        return math.sqrt(between_sum / total_sum)

    target = dataframe[target_column]
    target_type = get_semantic_type(target_column)

    correlations = []

    for column in dataframe.columns:
        if column == target_column:
            continue

        column_type = get_semantic_type(column)
        feature = dataframe[column]

        value = None
        method = None

        # Ilościowa – ilościowa
        if target_type == "quantitative" and column_type == "quantitative":
            valid = pd.DataFrame({
                "target": pd.to_numeric(target, errors="coerce"),
                "feature": pd.to_numeric(feature, errors="coerce"),
            }).dropna()

            if len(valid) >= 2:
                correlation = valid["target"].corr(
                    valid["feature"],
                    method="pearson",
                )

                if pd.notna(correlation):
                    value = float(correlation)

            method = "pearson"

        # Jakościowa – jakościowa
        elif target_type == "qualitative" and column_type == "qualitative":
            value = cramers_v(target, feature)
            method = "cramers_v"

        # Ilościowa – jakościowa
        else:
            if target_type == "qualitative":
                value = correlation_ratio(target, feature)
            else:
                value = correlation_ratio(feature, target)

            method = "correlation_ratio"

        correlations.append({
            "column": str(column),
            "correlation": (
                None if value is None else float(value)
            ),
            "method": method,
        })

    return {
        "target": str(target_column),
        "target_type": target_type,
        "method": "mixed",
        "correlations": correlations,
    }
