
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


RANDOM_STATE = 42
TEST_SIZE = 0.2


def prepare_modeling_data(
    dataframe: pd.DataFrame,
    target_column: str,
    task_type: str,
    excluded_features: list[str] | None = None,
) -> dict:
    """Przygotowuje dane do trenowania modelu."""

    if target_column not in dataframe.columns:
        raise ValueError(
            f"Nie znaleziono kolumny docelowej: {target_column}"
        )

    if task_type not in ["regression", "classification"]:
        raise ValueError(
            f"Nieobsługiwany typ zadania: {task_type}"
        )

    excluded_features = excluded_features or []

    if target_column in excluded_features:
        raise ValueError(
            "Nie można wykluczyć kolumny docelowej."
        )

    unknown_features = [
        column
        for column in excluded_features
        if column not in dataframe.columns
    ]

    if unknown_features:
        raise ValueError(
            f"Nie znaleziono wskazanych kolumn: {unknown_features}"
        )

    dataframe = dataframe.copy()

    # Konwersja zmiennej docelowej dla regresji.
    if task_type == "regression":
        dataframe[target_column] = pd.to_numeric(
            dataframe[target_column],
            errors="coerce",
        )

    # Usunięcie rekordów bez wartości zmiennej docelowej.
    rows_before = len(dataframe)

    dataframe = dataframe.dropna(
        subset=[target_column]
    )

    removed_target_rows = rows_before - len(dataframe)

    if len(dataframe) < 6:
        raise ValueError(
            "Zbiór danych musi zawierać co najmniej 6 rekordów "
            "z uzupełnioną zmienną docelową."
        )

    # Wybór cech: wszystkie poza zmienną docelową
    # i kolumnami wskazanymi do wykluczenia.
    feature_columns = [
        column
        for column in dataframe.columns
        if column != target_column
        and column not in excluded_features
    ]

    if not feature_columns:
        raise ValueError(
            "Brak cech wejściowych. "
            "Wybierz przynajmniej jedną kolumnę."
        )

    X = dataframe[feature_columns].copy()
    y = dataframe[target_column].copy()

    # Usunięcie całkowicie pustych kolumn wejściowych.
    empty_columns = [
        column
        for column in X.columns
        if X[column].isna().all()
    ]

    if empty_columns:
        X = X.drop(columns=empty_columns)

    if X.empty or len(X.columns) == 0:
        raise ValueError(
            "Brak dostępnych cech wejściowych po usunięciu "
            "pustych kolumn."
        )

    # Sprawdzenie brakujących wartości.
    missing_columns = [
        column
        for column in X.columns
        if X[column].isna().any()
    ]

    if missing_columns:
        raise ValueError(
            "W cechach wejściowych występują brakujące wartości: "
            f"{missing_columns}. "
            "Uzupełnij je w etapie Data Preparation."
        )

    # Konwersja kolumn daty na tekst.
    for column in X.columns:
        if pd.api.types.is_datetime64_any_dtype(X[column]):
            X[column] = X[column].astype(str)

    # Podział cech na numeryczne i kategoryczne.
    numeric_features = X.select_dtypes(
        include=["number"]
    ).columns.tolist()

    categorical_features = [
        column
        for column in X.columns
        if column not in numeric_features
    ]

    return {
        "X": X,
        "y": y,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "used_features": X.columns.tolist(),
        "excluded_features": excluded_features,
        "removed_empty_columns": empty_columns,
        "removed_target_rows": removed_target_rows,
    }


def split_modeling_data(
    X: pd.DataFrame,
    y: pd.Series,
    task_type: str,
):
    """Dzieli dane na zbiór treningowy i testowy."""

    stratify = None

    if task_type == "classification":
        class_counts = pd.Series(y).value_counts()

        number_of_classes = len(class_counts)
        test_size = int(np.ceil(len(y) * TEST_SIZE))

        # Stratyfikacja jest możliwa, gdy każda klasa
        # występuje przynajmniej dwa razy, a zbiór testowy
        # może zawierać przedstawicieli wszystkich klas.
        if (
            number_of_classes > 1
            and class_counts.min() >= 2
            and test_size >= number_of_classes
            and len(y) - test_size >= number_of_classes
        ):
            stratify = y

    return train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=stratify,
    )


def create_preprocessor(
    numeric_features: list[str],
    categorical_features: list[str],
    scale_numeric: bool = True,
) -> ColumnTransformer:
    """Tworzy preprocessing cech wejściowych."""

    transformers = []

    # Przetwarzanie cech numerycznych.
    if numeric_features:
        if scale_numeric:
            numeric_transformer = Pipeline(
                steps=[
                    ("scaler", StandardScaler()),
                ]
            )
        else:
            numeric_transformer = "passthrough"

        transformers.append(
            (
                "numeric",
                numeric_transformer,
                numeric_features,
            )
        )

    # Kodowanie cech kategorycznych.
    if categorical_features:
        categorical_transformer = OneHotEncoder(
            handle_unknown="ignore",
        )

        transformers.append(
            (
                "categorical",
                categorical_transformer,
                categorical_features,
            )
        )

    return ColumnTransformer(
        transformers=transformers,
        remainder="drop",
    )


def get_feature_importance(pipeline) -> dict:
    """Pobiera ważność cech lub współczynniki modelu."""

    model = pipeline.named_steps["model"]
    preprocessor = pipeline.named_steps["preprocessor"]

    feature_names = preprocessor.get_feature_names_out()

    if hasattr(model, "feature_importances_"):
        values = model.feature_importances_
        result_type = "importance"

    elif hasattr(model, "coef_"):
        values = np.asarray(model.coef_)

        if values.ndim > 1:
            values = np.mean(
                np.abs(values),
                axis=0,
            )
        else:
            values = np.abs(values)

        result_type = "coefficient"

    else:
        return {
            "type": "none",
            "features": [],
        }

    features = [
        {
            "feature": str(name),
            "importance": float(value),
        }
        for name, value in zip(feature_names, values)
    ]

    features.sort(
        key=lambda item: item["importance"],
        reverse=True,
    )

    return {
        "type": result_type,
        "features": features,
    }


def convert_to_list(values) -> list:
    """Konwertuje wartości NumPy na zwykłą listę Pythona."""

    return np.asarray(values).tolist()
