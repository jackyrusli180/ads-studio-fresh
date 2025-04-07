import logging
from django.core.management.base import BaseCommand

from integrations.okx.service import TokenListingService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Synchronize token listings from OKX exchange'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Starting token listings synchronization...'))
        
        service = TokenListingService()
        new_listings = service.sync_listings()
        
        self.stdout.write(
            self.style.SUCCESS(f'Token listings sync completed. {new_listings} new listings added.')
        ) 