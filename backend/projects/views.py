from rest_framework import generics

from .models import Project
from .serializers import ProjectSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(
            owner=self.request.user
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user
        )

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(
            owner=self.request.user
        )