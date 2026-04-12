from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.pharmacy.models import PharmacyInvoice, PharmacyInvoiceItem
from apps.pharmacy.serializers import PharmacyInvoiceSerializer, PharmacyInvoiceItemSerializer
from apps.shared.response import success_response

class PharmacyInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PharmacyInvoice.objects.all().order_by("-created_at")
    serializer_class = PharmacyInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return super().get_queryset().filter(hospital=self.request.user.hospital)
        
    def perform_create(self, serializer):
        # Generate invoice no if not present
        import uuid
        invoice_no = f"PHR-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(hospital=self.request.user.hospital, created_by=self.request.user, invoice_no=invoice_no)

class PharmacyInvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = PharmacyInvoiceItem.objects.all()
    serializer_class = PharmacyInvoiceItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return super().get_queryset().filter(invoice__hospital=self.request.user.hospital)
