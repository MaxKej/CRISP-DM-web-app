from typing import Any
import pandas as pd
from io import BytesIO

def remove_columns(
    dataframe: pd.DataFrame,
    columns: list[str],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Usuwa wskazane kolumny i zwraca podsumowanie operacji."""

    if not columns:
        raise ValueError("Wybierz przynajmniej jedną kolumnę.")

    if len(columns) != len(set(columns)):
        raise ValueError("Lista zawiera powtarzające się kolumny.")

    missing_columns = [
        column for column in columns
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Nie znaleziono kolumn: {', '.join(missing_columns)}"
        )

    if len(columns) >= len(dataframe.columns):
        raise ValueError(
            "Nie można usunąć wszystkich kolumn ze zbioru."
        )

    result = dataframe.drop(columns=columns).copy()

    summary = {
        "type": "remove_columns",
        "columns": columns,
        "columns_removed": len(columns),
        "rows_before": len(dataframe),
        "rows_after": len(result),
        "columns_before": len(dataframe.columns),
        "columns_after": len(result.columns),
    }

    return result, summary

def save_prepared_dataset(dataset, dataframe: pd.DataFrame) -> None:
    """Zapisuje przygotowany zbiór jako CSV."""

    buffer = BytesIO()
    dataframe.to_csv(
        buffer,
        index=False,
        encoding="utf-8-sig",
    )
    buffer.seek(0)

    filename = f"dataset_{dataset.pk}_prepared.csv"

    if dataset.prepared_file:
        dataset.prepared_file.delete(save=False)

    dataset.prepared_file.save(
        filename,
        buffer,
        save=False,
    )
    dataset.save(update_fields=["prepared_file", "updated_at"])

def remove_empty_rows(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Usuwa wiersze, w których wszystkie wartości są puste."""
    rows_before = len(dataframe)

    result = dataframe.dropna(how="all").copy()

    summary = {
        "type": "remove_empty_rows",
        "rows_before": rows_before,
        "rows_after": len(result),
        "rows_removed": rows_before - len(result),
    }

    return result, summary


def remove_duplicate_rows(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Usuwa powtarzające się wiersze, pozostawiając pierwsze wystąpienie."""
    rows_before = len(dataframe)

    result = dataframe.drop_duplicates(keep="first").copy()

    summary = {
        "type": "remove_duplicate_rows",
        "rows_before": rows_before,
        "rows_after": len(result),
        "rows_removed": rows_before - len(result),
    }

    return result, summary


def fill_missing_values(
    dataframe: pd.DataFrame,
    methods: dict[str, str],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Uzupełnia braki metodą wybraną dla każdej kolumny."""
    if not methods:
        raise ValueError("Wybierz co najmniej jedną kolumnę.")

    unknown_columns = [
        column for column in methods
        if column not in dataframe.columns
    ]
    if unknown_columns:
        raise ValueError(
            f"Nie znaleziono kolumn: {unknown_columns}"
        )

    result = dataframe.copy()
    filled_counts = {}

    for column, method in methods.items():
        missing_count = int(result[column].isna().sum())

        if missing_count == 0:
            filled_counts[column] = 0
            continue

        values = result[column].dropna()

        if values.empty:
            raise ValueError(
                f"Kolumna '{column}' zawiera wyłącznie braki."
            )

        if method == "mean":
            if not pd.api.types.is_numeric_dtype(result[column]):
                raise ValueError(
                    f"Średnia wymaga kolumny ilościowej: '{column}'."
                )
            fill_value = result[column].mean()

        elif method == "median":
            if not pd.api.types.is_numeric_dtype(result[column]):
                raise ValueError(
                    f"Mediana wymaga kolumny ilościowej: '{column}'."
                )
            fill_value = result[column].median()

        elif method == "mode":
            modes = values.mode()

            if modes.empty:
                raise ValueError(
                    f"Nie można wyznaczyć dominanty dla '{column}'."
                )

            if len(modes) > 1:
                raise ValueError(
                    f"Kolumna '{column}' ma kilka dominant. "
                    "Wybierz sposób rozstrzygnięcia remisu."
                )

            fill_value = modes.iloc[0]

        else:
            raise ValueError(
                f"Nieobsługiwana metoda '{method}' dla '{column}'."
            )

        result[column] = result[column].fillna(fill_value)
        filled_counts[column] = missing_count

    summary = {
        "type": "fill_missing_values",
        "methods": methods,
        "filled_counts": filled_counts,
        "values_filled": sum(filled_counts.values()),
    }

    return result, summary


def create_synthetic_column(
    dataframe: pd.DataFrame,
    name: str,
    left_column: str,
    operator: str,
    right_column: str,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Tworzy nową kolumnę na podstawie dwóch istniejących kolumn."""
    name = name.strip()

    if not name:
        raise ValueError("Nazwa nowej kolumny nie może być pusta.")

    if name in dataframe.columns:
        raise ValueError(f"Kolumna '{name}' już istnieje.")

    if left_column not in dataframe.columns:
        raise ValueError(f"Nie znaleziono kolumny '{left_column}'.")

    if right_column not in dataframe.columns:
        raise ValueError(f"Nie znaleziono kolumny '{right_column}'.")

    if operator not in {"+", "-", "*", "/"}:
        raise ValueError("Nieobsługiwany operator.")

    left = dataframe[left_column]
    right = dataframe[right_column]

    if not (
        pd.api.types.is_numeric_dtype(left)
        and pd.api.types.is_numeric_dtype(right)
    ):
        raise ValueError(
            "Obie kolumny muszą mieć wartości liczbowe."
        )

    if operator == "+":
        values = left + right
    elif operator == "-":
        values = left - right
    elif operator == "*":
        values = left * right
    else:
        values = left / right.replace(0, float("nan"))

    result = dataframe.copy()
    result[name] = values

    summary = {
        "type": "create_synthetic_column",
        "name": name,
        "left_column": left_column,
        "operator": operator,
        "right_column": right_column,
    }

    return result, summary
