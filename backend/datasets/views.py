import json

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Dataset, DatasetColumnType
from .charts import create_chart
from .serializers import (
    DatasetSerializer,
    DatasetColumnTypeSerializer,
    RemoveColumnsSerializer,
    RemoveRowsSerializer,
    FillMissingValuesSerializer, CreateSyntheticColumnSerializer, TargetColumnSerializer,
)
from .profiling import (
    load_dataset,
    load_prepared_dataset,
    profile_dataset, get_correlation_matrix, get_target_correlations,
)
from .preparation import (
    remove_columns,
    remove_empty_rows,
    remove_duplicate_rows,
    fill_missing_values,
    save_prepared_dataset, create_synthetic_column,
)

class DatasetListCreateView(generics.ListCreateAPIView):
    serializer_class = DatasetSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Dataset.objects.filter(
            project__owner=self.request.user
        ).order_by("-updated_at")

        project_id = self.request.query_params.get("project")

        if project_id:
            queryset = queryset.filter(
                project_id=project_id
            )

        return queryset

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]

        if project.owner != self.request.user:
            raise PermissionDenied(
                "Nie masz dostępu do tego projektu."
            )

        serializer.save()


class DatasetDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.filter(
            project__owner=self.request.user
        )

    def perform_destroy(self, instance: Dataset):
        file = instance.file

        instance.delete()

        if file:
            file.delete(save=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        self.perform_destroy(instance)

        return Response(
            {
                "detail": "Dataset został usunięty."
            },
            status=status.HTTP_200_OK,
        )


class DatasetProfileView(generics.RetrieveAPIView):
    serializer_class = DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.filter(
            project__owner=self.request.user
        )

    def retrieve(self, request, *args, **kwargs):
        dataset = self.get_object()

        profile = profile_dataset(dataset)

        return Response(profile)


class ChartView(generics.RetrieveAPIView):
    def get_queryset(self):
        return Dataset.objects.filter(
            project__owner=self.request.user
        )

    def retrieve(self, request, *args, **kwargs):
        dataset = self.get_object()

        chart_type = request.query_params.get("type")
        x = request.query_params.get("x")
        y = request.query_params.get("y")
        column = request.query_params.get("column")

        if not chart_type:
            raise ValidationError(
                "Parametr 'type' jest wymagany."
            )

        try:
            chart = create_chart(
                dataset=dataset,
                chart_type=chart_type,
                x=x,
                y=y,
                column=column,
            )
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        return Response(chart)

class DatasetPreviewView(generics.RetrieveAPIView):
    serializer_class = DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.filter(
            project__owner=self.request.user
        )

    def retrieve(self, request, *args, **kwargs):
        dataset = self.get_object()

        try:
            dataframe = load_dataset(dataset)
        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        preview = dataframe.head(10)

        # JSON poprawnie obsługuje braki danych i daty.
        rows = json.loads(
            preview.to_json(
                orient="records",
                date_format="iso",
                force_ascii=False,
            )
        )

        return Response({
            "dataset_id": dataset.id,
            "dataset_name": dataset.name,
            "columns": [str(column) for column in dataframe.columns],
            "rows": rows,
            "preview_rows": len(rows),
        })

class DatasetColumnTypeListView(generics.ListAPIView):
    serializer_class = DatasetColumnTypeSerializer

    def get_queryset(self):
        dataset_id = self.kwargs["dataset_id"]

        return DatasetColumnType.objects.filter(
            dataset_id=dataset_id,
            dataset__project__owner=self.request.user,
        )


class DatasetColumnTypeDetailView(generics.GenericAPIView):
    serializer_class = DatasetColumnTypeSerializer

    def get_dataset(self):
        return generics.get_object_or_404(
            Dataset.objects.filter(
                project__owner=self.request.user,
            ),
            pk=self.kwargs["dataset_id"],
        )

    def put(self, request, *args, **kwargs):
        dataset = self.get_dataset()
        column_name = self.kwargs["column_name"]

        try:
            dataframe = load_dataset(dataset)
        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        columns = [str(column) for column in dataframe.columns]

        if column_name not in columns:
            raise ValidationError(
                {"column_name": "Kolumna nie istnieje w tym zbiorze."}
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get("column_name", column_name) != column_name:
            raise ValidationError(
                {"column_name": "Nazwa kolumny nie może być zmieniana."}
            )

        column_type, _ = DatasetColumnType.objects.update_or_create(
            dataset=dataset,
            column_name=column_name,
            defaults={
                "semantic_type": serializer.validated_data["semantic_type"],
            },
        )

        return Response(self.get_serializer(column_type).data)


class DatasetRowPreparationView(APIView):
    """Widok bazowy dla operacji usuwania wierszy."""

    operation = None

    def post(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        serializer = RemoveRowsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        save = serializer.validated_data["save"]

        try:
            dataframe = load_prepared_dataset(dataset)

            result, summary = self.operation(dataframe)

            if save:
                save_prepared_dataset(dataset, result)

                operations = dataset.preparation_state.get(
                    "operations", []
                )
                operations.append(summary)

                dataset.preparation_state = {
                    **dataset.preparation_state,
                    "operations": operations,
                }
                dataset.save(
                    update_fields=["preparation_state", "updated_at"]
                )

        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        preview = json.loads(
            result.head(10).to_json(
                orient="records",
                date_format="iso",
                force_ascii=False,
            )
        )

        return Response({
            "dataset_id": dataset.id,
            "saved": save,
            "columns": [str(column) for column in result.columns],
            "rows": preview,
            "preview_rows": len(preview),
            "summary": summary,
        })


class DatasetRemoveEmptyRowsView(DatasetRowPreparationView):
    operation = staticmethod(remove_empty_rows)


class DatasetRemoveDuplicatesView(DatasetRowPreparationView):
    operation = staticmethod(remove_duplicate_rows)


class DatasetRemoveColumnsView(APIView):
    def get_dataset(self, dataset_id, user):
        return generics.get_object_or_404(
            Dataset.objects.filter(
                project__owner=user,
            ),
            pk=dataset_id,
        )

    def post(self, request, pk):
        dataset = self.get_dataset(pk, request.user)

        serializer = RemoveColumnsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        save = request.data.get("save", False)

        if not isinstance(save, bool):
            raise ValidationError({
                "save": "Wartość musi być typu boolean."
            })

        try:
            dataframe = load_prepared_dataset(dataset)
            result, summary = remove_columns(
                dataframe,
                serializer.validated_data["columns"],
            )

            if save:
                save_prepared_dataset(dataset, result)

                operations = dataset.preparation_state.get(
                    "operations", []
                )
                operations.append(summary)

                dataset.preparation_state = {
                    "operations": operations,
                }
                dataset.save(update_fields=["preparation_state", "updated_at"])

        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        preview = json.loads(
            result.head(10).to_json(
                orient="records",
                date_format="iso",
                force_ascii=False,
            )
        )

        return Response({
            "dataset_id": dataset.id,
            "saved": save,
            "columns": [str(column) for column in result.columns],
            "rows": preview,
            "preview_rows": len(preview),
            "summary": summary,
        })



class DatasetFillMissingValuesView(APIView):
    def post(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        serializer = FillMissingValuesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        methods = serializer.validated_data["methods"]
        save = serializer.validated_data["save"]

        try:
            dataframe = load_prepared_dataset(dataset)
            result, summary = fill_missing_values(dataframe, methods)

            if save:
                save_prepared_dataset(dataset, result)

                operations = dataset.preparation_state.get(
                    "operations", []
                )
                operations.append(summary)

                dataset.preparation_state = {
                    **dataset.preparation_state,
                    "operations": operations,
                }
                dataset.save(
                    update_fields=["preparation_state", "updated_at"]
                )

        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        preview = json.loads(
            result.head(10).to_json(
                orient="records",
                date_format="iso",
                force_ascii=False,
            )
        )

        return Response({
            "dataset_id": dataset.id,
            "saved": save,
            "columns": [str(column) for column in result.columns],
            "rows": preview,
            "preview_rows": len(preview),
            "summary": summary,
        })


class DatasetCreateSyntheticColumnView(APIView):
    def post(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        serializer = CreateSyntheticColumnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        save = data["save"]

        try:
            dataframe = load_prepared_dataset(dataset)

            result, summary = create_synthetic_column(
                dataframe=dataframe,
                name=data["name"],
                left_column=data["left_column"],
                operator=data["operator"],
                right_column=data["right_column"],
            )

            if save:
                save_prepared_dataset(dataset, result)

                operations = dataset.preparation_state.get(
                    "operations", []
                )
                operations.append(summary)

                dataset.preparation_state = {
                    **dataset.preparation_state,
                    "operations": operations,
                }
                dataset.save(
                    update_fields=["preparation_state", "updated_at"]
                )

        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        preview = json.loads(
            result.head(10).to_json(
                orient="records",
                date_format="iso",
                force_ascii=False,
            )
        )

        return Response({
            "dataset_id": dataset.id,
            "saved": save,
            "columns": [str(column) for column in result.columns],
            "rows": preview,
            "preview_rows": len(preview),
            "summary": summary,
        })


class DatasetTargetView(APIView):
    def put(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        serializer = TargetColumnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = serializer.validated_data["target_column"]

        if target:
            try:
                dataframe = load_prepared_dataset(dataset)
            except (ValueError, OSError) as exc:
                raise ValidationError(str(exc)) from exc

            if target not in dataframe.columns:
                raise ValidationError({
                    "target_column": (
                        f"Nie znaleziono kolumny '{target}'."
                    )
                })

        dataset.target_column = target
        dataset.save(
            update_fields=["target_column", "updated_at"]
        )

        return Response({
            "dataset_id": dataset.id,
            "target_column": dataset.target_column or None,
        })


class DatasetCorrelationMatrixView(APIView):
    def get(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        try:
            result = get_correlation_matrix(dataset)
        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        return Response(result)


class DatasetTargetCorrelationsView(APIView):
    def get(self, request, pk):
        dataset = generics.get_object_or_404(
            Dataset.objects.filter(project__owner=request.user),
            pk=pk,
        )

        try:
            result = get_target_correlations(dataset)
        except (ValueError, OSError) as exc:
            raise ValidationError(str(exc)) from exc

        return Response(result)
