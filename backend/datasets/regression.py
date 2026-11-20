
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline

from xgboost import XGBRegressor

from .modeling import (
    RANDOM_STATE,
    prepare_modeling_data,
    split_modeling_data,
    create_preprocessor,
    get_feature_importance,
    convert_to_list,
)

from .modeling_charts import (
    prepare_actual_vs_predicted,
    prepare_residuals,
    prepare_feature_importance,
)


MODELS = {
    "linear_regression": lambda: LinearRegression(),
    "ridge": lambda: Ridge(alpha=1.0),
    "lasso": lambda: Lasso(
        alpha=0.1,
        max_iter=10000,
    ),
    "xgboost": lambda: XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
}


def train_regression_model(
    dataframe,
    target_column: str,
    model_type: str,
    excluded_features=None,
) -> dict:
    """Trenuje model regresyjny i przygotowuje wyniki."""

    if model_type not in MODELS:
        raise ValueError(
            f"Nieobsługiwany model regresyjny: {model_type}"
        )

    prepared_data = prepare_modeling_data(
        dataframe=dataframe,
        target_column=target_column,
        task_type="regression",
        excluded_features=excluded_features,
    )

    X = prepared_data["X"]
    y = prepared_data["y"]

    X_train, X_test, y_train, y_test = split_modeling_data(
        X,
        y,
        task_type="regression",
    )

    preprocessor = create_preprocessor(
        numeric_features=prepared_data["numeric_features"],
        categorical_features=prepared_data["categorical_features"],
        scale_numeric=model_type != "xgboost",
    )

    model = MODELS[model_type]()

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    # Metryki regresji
    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(mean_squared_error(y_test, predictions) ** 0.5),
        "r2": float(r2_score(y_test, predictions)),
    }

    # Ważność cech lub współczynniki modelu
    feature_importance = get_feature_importance(pipeline)

    # Dane do wykresów
    charts = {
        "actual_vs_predicted": prepare_actual_vs_predicted(
            y_test,
            predictions,
        ),
        "residuals": prepare_residuals(
            y_test,
            predictions,
        ),
        "feature_importance": prepare_feature_importance(
            feature_importance,
        ),
    }

    return {
        "task_type": "regression",
        "model_type": model_type,
        "target_column": target_column,

        "metrics": metrics,
        "charts": charts,

        "feature_importance": feature_importance,

        "used_features": prepared_data["used_features"],
        "excluded_features": prepared_data["excluded_features"],
        "removed_empty_columns": prepared_data["removed_empty_columns"],
        "removed_target_rows": prepared_data["removed_target_rows"],

        "train_rows": len(X_train),
        "test_rows": len(X_test),

        "predictions": {
            "actual": convert_to_list(y_test),
            "predicted": convert_to_list(predictions),
        },
    }
