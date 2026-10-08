from pathlib import Path

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