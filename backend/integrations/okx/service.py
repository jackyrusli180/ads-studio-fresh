import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from .scraper import OKXListingScraper
from .models import TokenListing

logger = logging.getLogger(__name__)


class TokenListingService:
    """
    Service class to handle operations related to token listings
    """
    
    def __init__(self):
        self.scraper = OKXListingScraper()
    
    @transaction.atomic
    def sync_listings(self) -> int:
        """
        Scrape and synchronize token listings data with the database
        
        Returns:
            int: Number of new listings added
        """
        try:
            # Get all listings from the scraper
            scraped_listings = self.scraper.scrape_listings()
            
            # Track how many new listings we added
            new_listings_count = 0
            
            for listing_data in scraped_listings:
                # Skip entries without necessary data
                if not (listing_data.get('symbol') and listing_data.get('publication_date')):
                    continue
                
                # Check if we already have this listing
                existing = TokenListing.objects.filter(
                    symbol=listing_data['symbol'],
                    listing_type=listing_data['listing_type'],
                    region=listing_data['region']
                ).first()
                
                if existing:
                    # Update existing entry
                    for key, value in listing_data.items():
                        if key != 'publication_date':  # Don't update the publication date of existing entries
                            setattr(existing, key, value)
                    existing.save()
                else:
                    # Create new entry
                    TokenListing.objects.create(
                        title=listing_data['title'],
                        symbol=listing_data['symbol'],
                        publication_date=listing_data['publication_date'],
                        source_url=listing_data['source_url'],
                        listing_type=listing_data['listing_type'],
                        region=listing_data['region'],
                        raw_date_str=listing_data.get('raw_date_str', '')
                    )
                    new_listings_count += 1
            
            logger.info(f"Sync completed: {new_listings_count} new token listings added")
            return new_listings_count
            
        except Exception as e:
            logger.error(f"Error synchronizing token listings: {e}")
            return 0
    
    def get_recent_listings(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get recent token listings from the database
        
        Args:
            days: Number of days to look back
            
        Returns:
            List of token listings as dictionaries
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        listings = TokenListing.objects.filter(
            publication_date__gte=cutoff_date
        ).order_by('-publication_date')
        
        return [
            {
                'id': listing.id,
                'title': listing.title,
                'symbol': listing.symbol,
                'publication_date': listing.publication_date,
                'listing_type': listing.listing_type,
                'region': listing.region,
                'source_url': listing.source_url
            }
            for listing in listings
        ] 