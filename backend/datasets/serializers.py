from pathlib import Path

from rest_framework import serializers

from .models import Dataset, DatasetColumnType


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = [
            "id",
            "project",
            "name",
            "file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "name",
            "created_at",
            "updated_at",
        ]

    def validate_project(self, project):
        request = self.context["request"]

        if project.owner != request.user:
            raise serializers.ValidationError(
                "Nie masz dostępu do tego projektu."
            )

        return project

    def create(self, validated_data):
        uploaded_file = validated_data["file"]

        filename = Path(uploaded_file.name).stem.strip()

        if not filename:
            raise serializers.ValidationError(
                {
                    "file": "Nie można utworzyć nazwy datasetu na podstawie nazwy pliku."
                }
            )

        validated_data["name"] = filename

        return super().create(validated_data)

class DatasetColumnTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetColumnType
        fields = ["id", "column_name", "semantic_type"]
        read_only_fields = ["id"]

    def validate_semantic_type(self, value):
        allowed_types = {
            DatasetColumnType.SemanticType.QUANTITATIVE,
            DatasetColumnType.SemanticType.QUALITATIVE,
        }

        if value not in allowed_types:
            raise serializers.ValidationError(
                "Nieobsługiwany typ analityczny."
            )

        return value

class RemoveColumnsSerializer(serializers.Serializer):
    columns = serializers.ListField(
        child=serializers.CharField(
            allow_blank=False,
            trim_whitespace=False,
        ),
        allow_empty=False,
    )


class RemoveRowsSerializer(serializers.Serializer):
    """Parametry operacji usuwania wierszy."""

    save = serializers.BooleanField(
        default=False,
        required=False,
    )


class FillMissingValuesSerializer(serializers.Serializer):
    methods = serializers.DictField(
        child=serializers.ChoiceField(
            choices=["mean", "median", "mode"],
        ),
        allow_empty=False,
    )
    save = serializers.BooleanField(
        default=False,
        required=False,
    )

class CreateSyntheticColumnSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=255,
        allow_blank=False,
        trim_whitespace=True,
    )
    left_column = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )
    operator = serializers.ChoiceField(
        choices=["+", "-", "*", "/"],
    )
    right_column = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )
    save = serializers.BooleanField(
        default=False,
        required=False,
    )

class TargetColumnSerializer(serializers.Serializer):
    target_column = serializers.CharField(
        allow_blank=True,
        trim_whitespace=True,
    )


class ModelingSerializer(serializers.Serializer):
    task_type = serializers.ChoiceField(
        choices=["regression", "classification"],
    )

    model_type = serializers.ChoiceField(
        choices=[
            "linear_regression",
            "ridge",
            "lasso",
            "logistic_regression",
            "random_forest",
            "xgboost",
        ],
    )

    excluded_features = serializers.ListField(
        child=serializers.CharField(
            allow_blank=False,
            trim_whitespace=True,
        ),
        required=False,
        default=list,
        allow_empty=True,
    )

    def validate(self, attrs):
        task_type = attrs["task_type"]
        model_type = attrs["model_type"]

        regression_models = {
            "linear_regression",
            "ridge",
            "lasso",
            "xgboost",
        }

        classification_models = {
            "logistic_regression",
            "random_forest",
            "xgboost",
        }

        if (
            task_type == "regression"
            and model_type not in regression_models
        ):
            raise serializers.ValidationError({
                "model_type": "Wybrany algorytm nie obsługuje regresji."
            })

        if (
            task_type == "classification"
            and model_type not in classification_models
        ):
            raise serializers.ValidationError({
                "model_type": "Wybrany algorytm nie obsługuje klasyfikacji."
            })

        return attrs


class CustomOutlierRuleSerializer(serializers.Serializer):
    column = serializers.CharField()
    operator = serializers.ChoiceField(
        choices=[
            "eq",
            "ne",
            "lt",
            "lte",
            "gt",
            "gte",
        ]
    )
    value = serializers.FloatField()

class RemoveOutliersSerializer(serializers.Serializer):
    columns = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    std_threshold = serializers.IntegerField(
        required=False,
        allow_null=True,
        default=None,
    )
    custom_rules = CustomOutlierRuleSerializer(
        many=True,
        required=False,
        default=list,
    )
    save = serializers.BooleanField(default=False)

    def validate_std_threshold(self, value):
        if value is not None and value not in {2, 3, 4, 5, 6}:
            raise serializers.ValidationError(
                "Próg musi wynosić od 2 do 6."
            )
        return value