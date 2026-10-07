from typing import Any

import pandas as pd

from .profiling import load_dataset


def prepare_histogram(
    dataframe: pd.DataFrame,
    column: str,
) -> dict[str, Any]:
    """
    Przygotowuje dane do histogramu.
    """

    if column not in dataframe.columns:
        raise ValueError(
            f"Kolumna '{column}' nie istnieje."
        )

    series = dataframe[column]

    if not pd.api.types.is_numeric_dtype(series):
        raise ValueError(
            "Histogram może być utworzony tylko dla "
            "kolumny numerycznej."
        )

    values = series.dropna()

    if values.empty:
        raise ValueError(
            "Kolumna nie zawiera danych."
        )

    counts, bins = pd.cut(
        values,
        bins=10,
        retbins=True,
    )

    histogram = (
        pd.Series(counts)
        .value_counts()
        .sort_index()
    )

    data = []

    for interval, count in histogram.items():
        data.append(
            {
                "bin": str(interval),
                "count": int(count),
            }
        )

    return {
        "type": "histogram",
        "column": column,
        "data": data,
    }


def prepare_scatter(
    dataframe: pd.DataFrame,
    x: str,
    y: str,
) -> dict[str, Any]:
    """
    Przygotowuje dane do wykresu punktowego.
    """

    if x not in dataframe.columns:
        raise ValueError(
            f"Kolumna '{x}' nie istnieje."
        )

    if y not in dataframe.columns:
        raise ValueError(
            f"Kolumna '{y}' nie istnieje."
        )

    if not pd.api.types.is_numeric_dtype(dataframe[x]):
        raise ValueError(
            f"Kolumna '{x}' musi być numeryczna."
        )

    if not pd.api.types.is_numeric_dtype(dataframe[y]):
        raise ValueError(
            f"Kolumna '{y}' musi być numeryczna."
        )

    data = dataframe[[x, y]].dropna()

    if data.empty:
        raise ValueError(
            "Brak danych do utworzenia wykresu."
        )

    return {
        "type": "scatter",
        "x": x,
        "y": y,
        "data": [
            {
                "x": float(row[x]),
                "y": float(row[y]),
            }
            for _, row in data.iterrows()
        ],
    }


def prepare_bar(
    dataframe: pd.DataFrame,
    column: str,
) -> dict[str, Any]:
    """
    Przygotowuje dane do wykresu słupkowego.
    """

    if column not in dataframe.columns:
        raise ValueError(
            f"Kolumna '{column}' nie istnieje."
        )

    series = dataframe[column].dropna()

    if series.empty:
        raise ValueError(
            "Kolumna nie zawiera danych."
        )

    counts = series.value_counts()

    data = [
        {
            "category": str(category),
            "count": int(count),
        }
        for category, count in counts.items()
    ]

    return {
        "type": "bar",
        "column": column,
        "data": data,
    }


def create_chart(
    dataset,
    chart_type: str,
    x: str | None = None,
    y: str | None = None,
    column: str | None = None,
) -> dict[str, Any]:
    """
    Tworzy dane do wybranego typu wykresu.
    """

    dataframe = load_dataset(dataset)

    if chart_type == "histogram":
        if not column:
            raise ValueError(
                "Dla histogramu należy podać parametr 'column'."
            )

        return prepare_histogram(
            dataframe,
            column,
        )

    if chart_type == "scatter":
        if not x or not y:
            raise ValueError(
                "Dla scatter plot należy podać parametry 'x' i 'y'."
            )

        return prepare_scatter(
            dataframe,
            x,
            y,
        )

    if chart_type == "bar":
        if not column:
            raise ValueError(
                "Dla wykresu słupkowego należy podać parametr 'column'."
            )

        return prepare_bar(
            dataframe,
            column,
        )

    raise ValueError(
        "Nieobsługiwany typ wykresu. "
        "Dostępne typy: histogram, scatter, bar."
    )