# report_api.py
from ninja import Router
from .models import ProductReport, Product
from .schemas import ProductOut, ProductReportResponse

from users.models import UserProfile
from typing import List
from django.http import Http404

report_router = Router()

def serialize_product(product: Product) -> ProductOut:
    """Serialize a Product model instance to ProductOut schema"""
    return ProductOut(
        product_id=product.product_id,
        name=product.name,
        description=product.description,
        price=product.price,
        condition=product.condition,
        image_urls=product.image_urls,
        seller_id=product.seller_id,
        category_id=product.category_id if product.category else None,
        is_wanted=product.is_wanted,
        location=product.location,
        created_at=product.created_at,
        updated_at=product.updated_at,
        category_name=product.category.category_name if product.category else None,
        rejection_reason=product.rejection_reason
    )


#@report_router.get("", response=List[ProductOut])
#def get_reported_products(request):
    #reports = ProductReport.objects.filter(status="pending")
    #return [serialize_product(report.product) for report in reports]
@report_router.get("", response=List[ProductReportResponse])
def get_reported_products(request):
    reports = ProductReport.objects.filter(status="pending").select_related('product', 'product__category')
    return [{
        "report_id": report.report_id,
        "status": report.status,
        "product": serialize_product(report.product),
        "reported_by_id": report.reported_by_id,
        "rejection_reason": getattr(report, 'rejection_reason', None)
    } for report in reports]


@report_router.post("/{report_id}/delete")
def delete_reported_product(request, report_id: int):
    try:
        report = ProductReport.objects.get(report_id=report_id)
        report.product.status = "removed"
        report.product.approve_status = "rejected"
        report.status = "deleted"
        report.save()
        return {"detail": "Product deleted and report closed"}
    except ProductReport.DoesNotExist:
        raise Http404("Report not found")

@report_router.post("/{report_id}/keep")
def keep_reported_product(request, report_id: int):
    try:
        report = ProductReport.objects.get(report_id=report_id)
        report.status = "kept"
        report.save()
        return {"detail": "Product retained and report closed"}
    except ProductReport.DoesNotExist:
        raise Http404("Report not found")

@report_router.post("/{product_id}")
def report_product(request, product_id: int, user_id: int):
    try:
        product = Product.objects.get(product_id=product_id)
        report = ProductReport.objects.create(
            product=product,
            reported_by=UserProfile.objects.get(user_id=user_id),
            status="pending"
        )
        return {"report_id": report.report_id, "detail": "Product reported successfully"}
    except Product.DoesNotExist:
        raise Http404("Product not found")