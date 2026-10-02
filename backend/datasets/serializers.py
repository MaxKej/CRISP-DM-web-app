from rest_framework import serializers

from .models import Dataset
from .validators import validate_dataset_file


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

    def validate_file(self, value):
        validate_dataset_file(value)
        return value