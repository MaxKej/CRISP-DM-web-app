import uuid
from pathlib import Path

from django.db import models

from projects.models import Project


def dataset_upload_path(instance, filename):
    extension = Path(filename).suffix.lower()

    return f"datasets/{uuid.uuid4()}{extension}"


class Dataset(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="datasets",
    )

    name = models.CharField(
        max_length=255
    )

    target_column = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    file = models.FileField(
        upload_to=dataset_upload_path
    )

    prepared_file = models.FileField(
        upload_to="datasets/prepared/",
        blank=True,
        null=True,
    )

    preparation_state = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name

class DatasetColumnType(models.Model):
    class SemanticType(models.TextChoices):
        QUANTITATIVE = "quantitative", "Ilościowa"
        QUALITATIVE = "qualitative", "Jakościowa"

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="column_types",
    )
    column_name = models.CharField(max_length=255)
    semantic_type = models.CharField(
        max_length=20,
        choices=SemanticType.choices,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["dataset", "column_name"],
                name="unique_dataset_column_type",
            ),
        ]

    def __str__(self):
        return f"{self.dataset.name}: {self.column_name} ({self.semantic_type})"