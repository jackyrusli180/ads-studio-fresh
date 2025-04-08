from django.urls import path
from . import views

urlpatterns = [
    # Debug endpoint
    path('debug/', views.debug_api, name='debug_api'),
    
    path('image-history/', views.image_history, name='image_history'),
    path('generate-image/', views.generate_image, name='generate_image'),
    path('generate-headlines/', views.generate_headlines, name='generate_headlines'),
    path('apply-branding/', views.apply_branding, name='apply_branding'),
    path('send-for-approval/', views.send_for_approval, name='send_for_approval'),
    path('creative/<int:id>/', views.creative_detail, name='creative_detail'),
    path('edit-image/', views.edit_image, name='edit_image'),
    
    # Attribute management
    path('attributes/', views.get_attribute_categories, name='get_attributes'),
    path('attributes/filter/', views.filter_images_by_attributes, name='filter_by_attributes'),
    path('attributes/assign/<int:image_id>/', views.assign_attributes, name='assign_attributes'),
    path('attributes/auto-tag/<int:image_id>/', views.auto_tag_image, name='auto_tag_image'),
] 