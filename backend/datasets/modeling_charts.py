
from typing import Any

import numpy as np


def _to_list(values: Any) -> list:
    """Konwertuje wartości NumPy na zwykłą listę Pythona."""
    return np.asarray(values).tolist()


def prepare_actual_vs_predicted(
    actual: Any,
    predicted: Any,
) -> dict:
    """Przygotowuje dane do wykresu wartości rzeczywistych i przewidywanych."""

    actual_values = _to_list(actual)
    predicted_values = _to_list(predicted)

    data = [
        {
            "actual": float(actual_value),
            "predicted": float(predicted_value),
        }
        for actual_value, predicted_value in zip(
            actual_values,
            predicted_values,
        )
    ]

    return {
        "data": data,
        "x_key": "actual",
        "y_key": "predicted",
    }


def prepare_residuals(
    actual: Any,
    predicted: Any,
) -> dict:
    """Przygotowuje dane do wykresu reszt modelu regresyjnego."""

    actual_values = np.asarray(actual, dtype=float)
    predicted_values = np.asarray(predicted, dtype=float)

    residuals = actual_values - predicted_values

    data = [
        {
            "predicted": float(predicted_value),
            "residual": float(residual),
        }
        for predicted_value, residual in zip(
            predicted_values,
            residuals,
        )
    ]

    return {
        "data": data,
        "x_key": "predicted",
        "y_key": "residual",
    }


def prepare_confusion_matrix(
    labels: Any,
    matrix: Any,
) -> dict:
    """Przygotowuje macierz pomyłek do wyświetlenia w aplikacji."""

    labels = _to_list(labels)
    matrix = np.asarray(matrix).tolist()

    data = []

    for actual_index, actual_label in enumerate(labels):
        for predicted_index, predicted_label in enumerate(labels):
            data.append(
                {
                    "actual": str(actual_label),
                    "predicted": str(predicted_label),
                    "count": int(
                        matrix[actual_index][predicted_index]
                    ),
                }
            )

    return {
        "labels": [str(label) for label in labels],
        "matrix": matrix,
        "data": data,
    }


def prepare_roc_curve(
    fpr: Any,
    tpr: Any,
    thresholds: Any = None,
) -> dict | None:
    """Przygotowuje dane do krzywej ROC."""

    if fpr is None or tpr is None:
        return None

    fpr_values = _to_list(fpr)
    tpr_values = _to_list(tpr)

    threshold_values = (
        _to_list(thresholds)
        if thresholds is not None
        else [None] * len(fpr_values)
    )

    data = []

    for false_positive_rate, true_positive_rate, threshold in zip(
        fpr_values,
        tpr_values,
        threshold_values,
    ):
        # Wartość nieskończona nie jest poprawnym JSON-em.
        if threshold is not None and not np.isfinite(threshold):
            threshold = None

        data.append(
            {
                "fpr": float(false_positive_rate),
                "tpr": float(true_positive_rate),
                "threshold": (
                    float(threshold)
                    if threshold is not None
                    else None
                ),
            }
        )

    return {
        "data": data,
        "x_key": "fpr",
        "y_key": "tpr",
    }


def prepare_feature_importance(
    feature_importance: dict,
) -> dict:
    """Przygotowuje ważność cech lub współczynniki modelu."""

    features = feature_importance.get("features", [])

    data = [
        {
            "feature": str(item["feature"]),
            "importance": float(item["importance"]),
        }
        for item in features
    ]

    return {
        "type": feature_importance.get("type", "importance"),
        "data": data,
    }
