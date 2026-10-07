from django.urls import path

from .views import (
    DatasetListCreateView,
    DatasetDetailView,
    DatasetProfileView,
    ChartView,
)

urlpatterns = [
    path(
        "",
        DatasetListCreateView.as_view(),
        name="dataset-list-create",
    ),
    path(
        "<int:pk>/",
        DatasetDetailView.as_view(),
        name="dataset-detail",
    ),
    path(
        "<int:pk>/profile/",
        DatasetProfileView.as_view(),
        name="dataset-profile",
    ),
    path(
        "<int:pk>/chart/",
        ChartView.as_view(),
        name="dataset-chart",
    ),
]