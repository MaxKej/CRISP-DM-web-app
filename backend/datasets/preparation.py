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

def remove_outliers(
    dataframe: pd.DataFrame,
    columns: list[str],
    std_threshold: int | None,
    custom_rules: list[dict[str, Any]],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Usuwa rekordy wskazane przez reguły wartości odstających."""

    if not columns and not custom_rules:
        raise ValueError(
            "Wybierz kolumny do analizy lub dodaj regułę niestandardową."
        )

    if std_threshold is not None and std_threshold not in {2, 3, 4, 5, 6}:
        raise ValueError(
            "Próg odchyleń standardowych musi wynosić od 2 do 6."
        )

    if columns and std_threshold is None:
        raise ValueError(
            "Wybierz próg odchyleń standardowych."
        )

    if len(columns) != len(set(columns)):
        raise ValueError(
            "Lista kolumn zawiera powtórzenia."
        )

    result = dataframe.copy()
    remove_mask = pd.Series(False, index=dataframe.index)

    standard_deviation_summary = {}

    # Reguły oparte na odchyleniu standardowym.
    for column in columns:
        if column not in dataframe.columns:
            raise ValueError(
                f"Nie znaleziono kolumny '{column}'."
            )

        if not pd.api.types.is_numeric_dtype(dataframe[column]):
            raise ValueError(
                f"Kolumna '{column}' nie jest kolumną liczbową."
            )

        mean = dataframe[column].mean()
        std = dataframe[column].std()

        if pd.isna(mean) or pd.isna(std):
            raise ValueError(
                f"Nie można obliczyć odchylenia standardowego "
                f"dla kolumny '{column}'."
            )

        lower_bound = mean - std_threshold * std
        upper_bound = mean + std_threshold * std

        column_mask = (
            (dataframe[column] < lower_bound)
            | (dataframe[column] > upper_bound)
        ).fillna(False)

        remove_mask |= column_mask

        standard_deviation_summary[column] = {
            "mean": float(mean),
            "std": float(std),
            "threshold": std_threshold,
            "lower_bound": float(lower_bound),
            "upper_bound": float(upper_bound),
            "rows_removed": int(column_mask.sum()),
        }

    # Reguły niestandardowe.
    allowed_operators = {
        "eq", "ne", "lt", "lte", "gt", "gte"
    }

    custom_rules_summary = []

    for rule in custom_rules:
        column = rule["column"]
        operator = rule["operator"]
        value = rule["value"]

        if column not in dataframe.columns:
            raise ValueError(
                f"Nie znaleziono kolumny '{column}'."
            )

        if not pd.api.types.is_numeric_dtype(dataframe[column]):
            raise ValueError(
                f"Reguły niestandardowe wymagają kolumny liczbowej: "
                f"'{column}'."
            )

        if operator not in allowed_operators:
            raise ValueError(
                f"Nieobsługiwany operator '{operator}'."
            )

        try:
            value = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Wartość reguły dla kolumny '{column}' musi być liczbą."
            ) from exc

        series = dataframe[column]

        if operator == "eq":
            rule_mask = series == value
        elif operator == "ne":
            rule_mask = series != value
        elif operator == "lt":
            rule_mask = series < value
        elif operator == "lte":
            rule_mask = series <= value
        elif operator == "gt":
            rule_mask = series > value
        else:
            rule_mask = series >= value

        rule_mask = rule_mask.fillna(False)
        remove_mask |= rule_mask

        custom_rules_summary.append({
            "column": column,
            "operator": operator,
            "value": value,
            "rows_matching": int(rule_mask.sum()),
        })

    rows_before = len(dataframe)
    result = dataframe.loc[~remove_mask].copy()
    rows_removed = rows_before - len(result)

    summary = {
        "type": "remove_outliers",
        "columns": columns,
        "std_threshold": std_threshold,
        "standard_deviation_rules": standard_deviation_summary,
        "custom_rules": custom_rules_summary,
        "rows_before": rows_before,
        "rows_after": len(result),
        "rows_removed": rows_removed,
    }

    return result, summary