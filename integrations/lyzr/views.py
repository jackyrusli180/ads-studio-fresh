from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .service import LyzrTokenListingService


class LyzrTokenListingView(APIView):
    """
    API view for token listings from Lyzr agent
    """
    # IMPORTANT: Disable authentication for development
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Get token listings data
        
        Uses stored analyses from DB if available and use_stored=true, 
        otherwise fetches from Lyzr agent directly
        """
        use_stored = request.query_params.get('use_stored', 'true').lower() == 'true'
        
        # Initialize service
        service = LyzrTokenListingService()
        
        if use_stored:
            # Check if we have stored analyses in the database
            analyses = service.get_recent_analyses(limit=5)
            
            if analyses:
                return Response({
                    'analyses': analyses,
                    'source': 'database'
                })
        
        # If no stored analyses or use_stored=false, get from agent directly
        response = service.get_recent_listings_raw()
        
        if not response.get('success', False):
            return Response({
                'error': response.get('error', 'Failed to fetch from Lyzr agent')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return the complete raw response for the frontend to handle parsing
        return Response({
            'raw_response': response.get('raw_response', {}),
            'source': 'agent',
            'success': True
        })
    
    def post(self, request):
        """
        Sync token listings from Lyzr agent to database
        """
        # Initialize service
        service = LyzrTokenListingService()
        
        # Trigger sync
        result = service.sync_from_agent_to_db()
        
        if not result.get('success', False):
            return Response({
                'error': result.get('error', 'Sync failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': 'Sync completed successfully',
            'new_listings': result.get('new_count', 0)
        }) 