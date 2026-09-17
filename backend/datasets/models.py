from django.db import models

from projects.models import Project


class Dataset(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="datasets",
    )

    name = models.CharField(
        max_length=255
    )

    file = models.FileField(
        upload_to="datasets/"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name