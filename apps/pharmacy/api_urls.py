from django.urls import path, include
from rest_framework import routers
from apps.pharmacy.views import PharmacyInvoiceViewSet, PharmacyInvoiceItemViewSet

router = routers.DefaultRouter()
router.register(r'pharmacy-invoices', PharmacyInvoiceViewSet)
router.register(r'pharmacy-invoice-items', PharmacyInvoiceItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
