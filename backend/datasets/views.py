from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser

from .models import Dataset
from .serializers import DatasetSerializer


class DatasetListCreateView(generics.ListCreateAPIView):
    serializer_class = DatasetSerializer

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_queryset(self):
        return Dataset.objects.filter(
            project__owner=self.request.user
        ).order_by("-updated_at")

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