"""
URL configuration for ads_studio project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.generic import TemplateView
from accounts.api.views import UserViewSet, test_auth
from integrations.okx.views import TokenListingView
from integrations.lyzr.views import LyzrTokenListingView
from integrations.meta.views import CompetitorAdsView

# API router setup
router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
# Register API viewsets here

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/test-auth/', test_auth, name='test_auth'),
    
    # Integration APIs
    path('api/integrations/token-listings/', TokenListingView.as_view(), name='token_listings'),
    path('api/integrations/lyzr/token-listings/', LyzrTokenListingView.as_view(), name='lyzr_token_listings'),
    path('api/integrations/meta/competitor-ads/', CompetitorAdsView.as_view(), name='competitor_ads'),
    
    # AIGC API
    path('api/aigc/', include('aigc.urls')),
    
    # React App - serve the index.html for all non-API routes
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
