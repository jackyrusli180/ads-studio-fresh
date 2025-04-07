import logging
from django.core.management.base import BaseCommand

from integrations.lyzr.service import LyzrTokenListingService
from integrations.lyzr.models import LyzrTokenAnalysis

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Synchronize token listings from Lyzr AI agent and store in database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--purge',
            action='store_true',
            help='Delete existing analyses before syncing',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Starting token listings synchronization from Lyzr agent...'))
        
        # Purge existing analyses if requested
        if options['purge']:
            count = LyzrTokenAnalysis.objects.all().count()
            LyzrTokenAnalysis.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {count} existing analyses'))
        
        # Initialize service
        service = LyzrTokenListingService()
        
        # Get existing count
        existing_count = LyzrTokenAnalysis.objects.all().count()
        self.stdout.write(self.style.HTTP_INFO(f'Current analyses in database: {existing_count}'))
        
        # Sync new analyses
        try:
            result = service.sync_from_agent_to_db()
            
            if not result.get('success', False):
                error_msg = result.get('error', 'Unknown error occurred during sync')
                self.stdout.write(self.style.ERROR(f'Sync failed: {error_msg}'))
                return
            
            new_count = result.get('new_count', 0)
            
            # Get updated count
            updated_count = LyzrTokenAnalysis.objects.all().count()
            
            self.stdout.write(
                self.style.SUCCESS(f'Lyzr agent token listings sync completed successfully.')
            )
            self.stdout.write(
                self.style.SUCCESS(f'Added {new_count} new analyses. Total analyses: {updated_count}')
            )
        except Exception as e:
            logger.exception("Error during sync command execution")
            self.stdout.write(
                self.style.ERROR(f'Error during sync: {str(e)}')
            ) 