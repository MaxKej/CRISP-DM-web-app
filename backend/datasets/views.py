import json

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Dataset, DatasetColumnType
from .serializers import DatasetSerializer, DatasetColumnTypeSerializer
from .profiling import load_dataset, profile_dataset
from .charts import create_chart


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
