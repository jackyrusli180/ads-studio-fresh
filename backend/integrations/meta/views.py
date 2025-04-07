from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication

from .services import MetaAdLibraryService


class CompetitorAdsView(APIView):
    """
    API view to fetch ads from competitors from Meta Ad Library
    """
    # For debugging, we'll allow any authentication method or none at all temporarily
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [AllowAny]  # Changed from IsAuthenticated for debugging
    
    def get(self, request, format=None):
        """
        GET request handler for competitor ads.
        
        Query parameters:
        - competitors: Comma-separated list of competitor names
            (Default: Binance,Coinbase,Kraken,Bybit,Kucoin,Bitget,MEXC,Gate.io,Bitfinex,Huobi)
        """
        # OKX's main competitors in the crypto exchange space
        default_competitors = [
            "Binance", "Coinbase", "Kraken", "Bybit", "Kucoin", 
            "Bitget", "MEXC", "Gate.io", "Bitfinex", "Huobi"
        ]
        
        # Get competitors from query params or use defaults
        competitors_param = request.query_params.get('competitors', '')
        if competitors_param:
            competitors = competitors_param.split(',')
        else:
            competitors = default_competitors
        
        # Initialize the service and fetch ads
        service = MetaAdLibraryService()
        ads_data = service.get_all_competitors_ads(competitors)
        
        return Response({
            'data': ads_data,
            'meta': {
                'competitors': competitors,
                'counts': {competitor: len(ads) for competitor, ads in ads_data.items()}
            }
        }, status=status.HTTP_200_OK)
