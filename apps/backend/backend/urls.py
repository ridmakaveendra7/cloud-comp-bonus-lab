"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI
from products.api import prodcut_router
from users.api import user_router
from users.moderator_api import moderator_router
from delivery_agent.api import delivery_agent_router
from products.moderatorreport_api import report_router

api = NinjaAPI()
api.add_router("products", prodcut_router)
api.add_router("users", user_router)
api.add_router("moderator", moderator_router)
api.add_router("delivery-agent", delivery_agent_router)
api.add_router("/reports", report_router, tags=["Reports"])
from django.urls import path, include


urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", api.urls),
    path('api/chats/', include('chats.urls'))
]
