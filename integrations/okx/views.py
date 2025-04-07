from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .service import TokenListingService
from .models import TokenListing


class TokenListingView(APIView):
    """
    API view for token listings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, format=None):
        """Get recent token listings"""
        # Get the days parameter from the query string, default to 30
        days = request.query_params.get('days', 30)
        try:
            days = int(days)
        except ValueError:
            days = 30
        
        service = TokenListingService()
        listings = service.get_recent_listings(days=days)
        
        return Response(listings)
    
    def post(self, request, format=None):
        """Trigger a sync of token listings"""
        service = TokenListingService()
        new_listings = service.sync_listings()
        
        return Response({
            'status': 'success',
            'message': f'Token listings sync completed',
            'new_listings': new_listings
        }) 