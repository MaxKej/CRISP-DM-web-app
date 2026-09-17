from rest_framework import serializers

from .models import Dataset


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
            "created_at",
            "updated_at",
        ]