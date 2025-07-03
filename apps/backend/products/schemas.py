from ninja import Schema
from typing import List, Optional
from datetime import datetime

class ProductIn(Schema):
    name: str
    description: str
    price: float
    condition: str
    image_urls: Optional[List[str]]
    seller_id: int            # just the seller id, not the whole user profile
    category_id: int
    is_wanted: bool
    location: Optional[str] = None 

class ProductOut(ProductIn):
    product_id: int
    created_at: datetime
    updated_at: datetime
    category_name: str
    rejection_reason: Optional[str] = None

class CategoryOut(Schema):
    category_id: int
    category_name: str

class ProductReportResponse(Schema):
    report_id: int
    status: str
    product: 'ProductOut'  
    rejection_reason: Optional[str] = None
    reported_by_id: int