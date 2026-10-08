from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Dataset
from .serializers import DatasetSerializer
from .profiling import profile_dataset
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