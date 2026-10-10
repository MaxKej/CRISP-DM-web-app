from django.urls import path

from .views import (
    DatasetListCreateView,
    DatasetDetailView,
    DatasetProfileView,
    ChartView,
    DatasetPreviewView,
    DatasetColumnTypeListView,
    DatasetColumnTypeDetailView,
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
    path(
        "<int:pk>/preview/",
        DatasetPreviewView.as_view(),
        name="dataset-preview",
    ),
    path(
        "<int:dataset_id>/column-types/",
        DatasetColumnTypeListView.as_view(),
        name="dataset-column-types",
    ),
    path(
        "<int:dataset_id>/column-types/<str:column_name>/",
        DatasetColumnTypeDetailView.as_view(),
        name="dataset-column-type-detail",
    ),
]