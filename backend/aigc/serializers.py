from rest_framework import serializers
from .models import AIGeneratedImage, AIGeneratedHeadline, Attribute, AttributeCategory, ImageAttribute

class AIGeneratedHeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIGeneratedHeadline
        fields = ['id', 'text', 'created_at']

class AttributeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Attribute
        fields = ['id', 'name', 'category', 'category_name']

class ImageAttributeSerializer(serializers.ModelSerializer):
    attribute = AttributeSerializer(read_only=True)
    
    class Meta:
        model = ImageAttribute
        fields = ['attribute', 'confidence', 'is_verified']

class AIGeneratedImageSerializer(serializers.ModelSerializer):
    headlines = AIGeneratedHeadlineSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    image_attributes = ImageAttributeSerializer(source='imageattribute_set', many=True, read_only=True)
    
    class Meta:
        model = AIGeneratedImage
        fields = [
            'id', 'username', 'prompt', 'image_url', 'branded_image_url', 
            'headline', 'tc_text', 'resolution', 'model_used', 'status', 
            'feedback', 'created_at', 'updated_at', 'headlines', 'used_reference_image',
            'image_attributes'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class AttributeCategorySerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)
    
    class Meta:
        model = AttributeCategory
        fields = ['id', 'name', 'attributes'] 