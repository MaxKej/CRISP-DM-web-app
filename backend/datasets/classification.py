
import numpy as np

from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from sklearn.pipeline import Pipeline

from xgboost import XGBClassifier

from .modeling import (
    RANDOM_STATE,
    prepare_modeling_data,
    split_modeling_data,
    create_preprocessor,
    get_feature_importance,
    convert_to_list,
)

from .modeling_charts import (
    prepare_confusion_matrix,
    prepare_roc_curve,
    prepare_feature_importance,
)


MODELS = {
    "logistic_regression": lambda: LogisticRegression(
        max_iter=2000,
        random_state=RANDOM_STATE,
    ),
    "random_forest": lambda: RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
}


def train_classification_model(
    dataframe,
    target_column: str,
    model_type: str,
    excluded_features=None,
) -> dict:
    """Trenuje model klasyfikacyjny i przygotowuje wyniki."""

    supported_models = [
        "logistic_regression",
        "random_forest",
        "xgboost",
    ]

    if model_type not in supported_models:
        raise ValueError(
            f"Nieobsługiwany model klasyfikacyjny: {model_type}"
        )

    prepared_data = prepare_modeling_data(
        dataframe=dataframe,
        target_column=target_column,
        task_type="classification",
        excluded_features=excluded_features,
    )

    X = prepared_data["X"]
    y = prepared_data["y"]

    # Kodowanie etykiet klas na wartości liczbowe.
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    number_of_classes = len(label_encoder.classes_)

    if number_of_classes < 2:
        raise ValueError(
            "Zmienna docelowa musi zawierać co najmniej dwie klasy."
        )

    X_train, X_test, y_train, y_test = split_modeling_data(
        X,
        y_encoded,
        task_type="classification",
    )

    # Dobór modelu
    if model_type == "xgboost":
        if number_of_classes == 2:
            model = XGBClassifier(
                n_estimators=300,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                objective="binary:logistic",
                eval_metric="logloss",
                random_state=RANDOM_STATE,
                n_jobs=-1,
            )
        else:
            model = XGBClassifier(
                n_estimators=300,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                objective="multi:softprob",
                eval_metric="mlogloss",
                num_class=number_of_classes,
                random_state=RANDOM_STATE,
                n_jobs=-1,
            )
    else:
        model = MODELS[model_type]()

    preprocessor = create_preprocessor(
        numeric_features=prepared_data["numeric_features"],
        categorical_features=prepared_data["categorical_features"],
        scale_numeric=model_type == "logistic_regression",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    probabilities = pipeline.predict_proba(X_test)

    # Metryki klasyfikacji
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(
            precision_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0,
            )
        ),
        "recall": float(
            recall_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0,
            )
        ),
        "f1": float(
            f1_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0,
            )
        ),
        "roc_auc": None,
    }

    # Macierz pomyłek
    class_indices = np.arange(number_of_classes)

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=class_indices,
    )

    confusion_chart = prepare_confusion_matrix(
        labels=label_encoder.classes_,
        matrix=matrix,
    )

    # Krzywa ROC i ROC AUC
    roc_chart = None

    if number_of_classes == 2:
        try:
            metrics["roc_auc"] = float(
                roc_auc_score(
                    y_test,
                    probabilities[:, 1],
                )
            )

            fpr, tpr, thresholds = roc_curve(
                y_test,
                probabilities[:, 1],
            )

            roc_chart = prepare_roc_curve(
                fpr,
                tpr,
                thresholds,
            )

        except ValueError:
            metrics["roc_auc"] = None
            roc_chart = None

    else:
        try:
            metrics["roc_auc"] = float(
                roc_auc_score(
                    y_test,
                    probabilities,
                    multi_class="ovr",
                    average="weighted",
                    labels=class_indices,
                )
            )
        except ValueError:
            metrics["roc_auc"] = None

    # Ważność cech lub współczynniki modelu
    feature_importance = get_feature_importance(pipeline)

    # Odtworzenie oryginalnych etykiet klas
    actual_labels = label_encoder.inverse_transform(y_test)
    predicted_labels = label_encoder.inverse_transform(predictions)

    classes = label_encoder.classes_

    # Dane do wykresów
    charts = {
        "confusion_matrix": confusion_chart,
        "roc_curve": roc_chart,
        "feature_importance": prepare_feature_importance(
            feature_importance,
        ),
    }

    return {
        "task_type": "classification",
        "model_type": model_type,
        "target_column": target_column,

        "metrics": metrics,
        "charts": charts,

        "feature_importance": feature_importance,

        "confusion_matrix": {
            "labels": confusion_chart["labels"],
            "matrix": confusion_chart["matrix"],
        },

        "used_features": prepared_data["used_features"],
        "excluded_features": prepared_data["excluded_features"],
        "removed_empty_columns": prepared_data["removed_empty_columns"],
        "removed_target_rows": prepared_data["removed_target_rows"],

        "train_rows": len(X_train),
        "test_rows": len(X_test),

        "predictions": {
            "actual": convert_to_list(actual_labels),
            "predicted": convert_to_list(predicted_labels),
            "probabilities": convert_to_list(probabilities),
            "classes": convert_to_list(classes),
        },
    }
