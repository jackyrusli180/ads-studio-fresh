from django.core.management.base import BaseCommand
from django.db import transaction
from aigc.models import AttributeCategory, Attribute

class Command(BaseCommand):
    help = 'Populate the database with predefined attributes for crypto exchange creatives'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating attribute categories and attributes...')
        
        with transaction.atomic():
            # Clear existing data if any
            AttributeCategory.objects.all().delete()
            
            # Define the attribute tree
            attribute_data = {
                'Asset Type': [
                    'Bitcoin/BTC',
                    'Ethereum/ETH',
                    'Altcoins',
                    'Stablecoins',
                    'DeFi Protocols',
                    'NFTs',
                    'Web3 Tools',
                    'Trading Platforms',
                    'Wallets',
                    'Metaverse',
                ],
                'Theme': [
                    'New Listings',
                    'New User Onboarding',
                    'Product Features',
                    'Promotional Campaigns', 
                    'Security & Trust',
                    'Educational Content',
                    'Trading Competitions',
                    'Market Updates',
                    'Community Building',
                ],
                'USP': [
                    'Number of Listings',
                    'New User Bonuses',
                    'Simple Onboarding',
                    'Large User Base',
                    'Security & Trust',
                    'Low Trading Fees',
                    'Fiat On-ramp Options',
                    'High Liquidity',
                    'Advanced Trading Tools',
                    'Mobile Experience',
                ],
                'Visual Style': [
                    'Minimalist',
                    'Data Visualization',
                    'Lifestyle/Aspirational',
                    'Futuristic/Tech',
                    'Brand-centric',
                    'Abstract',
                    'Illustrative',
                    'Photographic',
                    'Meme/Humor',
                    'Premium/Luxury',
                ],
                'Content Format': [
                    'Chart/Graph',
                    'Platform Screenshot',
                    'Character/Avatar',
                    'Conceptual Illustration',
                    'Comparison',
                    'Tutorial/How-to',
                    'User Testimonial',
                    'Product Feature',
                    'Promotional Offer',
                    'Animated/Dynamic',
                ],
            }
            
            # Create the categories and attributes
            for category_name, attributes in attribute_data.items():
                category, _ = AttributeCategory.objects.get_or_create(name=category_name)
                self.stdout.write(f'Created category: {category.name}')
                
                for attribute_name in attributes:
                    attribute, _ = Attribute.objects.get_or_create(
                        category=category,
                        name=attribute_name
                    )
                    self.stdout.write(f'  - Created attribute: {attribute.name}')
        
        self.stdout.write(self.style.SUCCESS('Successfully populated attribute data!')) 