import pandas as pd


def detect_outliers(dataframe, column_name):
    series = pd.to_numeric(dataframe[column_name], errors="coerce").dropna()

    if series.empty:
        return {
            "column": column_name,
            "method": "IQR",
            "lower_bound": None,
            "upper_bound": None,
            "outlier_count": 0,
            "outlier_values": [],
        }

    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = series[(series < lower_bound) | (series > upper_bound)]

    return {
        "column": column_name,
        "method": "IQR",
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound),
        "outlier_count": int(len(outliers)),
        "outlier_values": [
            float(value) for value in outliers.head(20).tolist()
        ],
    }