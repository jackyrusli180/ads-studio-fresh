import logging
import re
import datetime
from typing import Dict, List, Any, Optional

from django.utils import timezone

from .api import OKXTokenListingAgent
from .models import LyzrTokenAnalysis

logger = logging.getLogger(__name__)

class LyzrTokenListingService:
    """
    Service for retrieving and storing token listings from Lyzr AI agent
    """
    
    @staticmethod
    def get_recent_listings_raw() -> Dict[str, Any]:
        """
        Get raw token listings directly from the Lyzr agent
        
        Returns:
            Dict containing success flag, error message (if any), and raw listings data
        """
        agent = OKXTokenListingAgent()
        return agent.get_latest_token_listings()
    
    @staticmethod
    def sync_from_agent_to_db() -> Dict[str, Any]:
        """
        Sync token listings from Lyzr agent to the database
        
        Returns:
            Dict containing success status and count of new listings added
        """
        try:
            # Get data from Lyzr agent
            result = LyzrTokenListingService.get_recent_listings_raw()
            
            if not result['success']:
                return {
                    'success': False,
                    'error': result.get('error', 'Unknown error fetching from Lyzr agent'),
                    'new_count': 0
                }
            
            # Extract listings from result
            listings = result.get('listings', [])
            new_count = 0
            
            for listing in listings:
                raw_content = listing.get('raw_content')
                if raw_content:
                    # Create a new analysis record
                    LyzrTokenAnalysis.objects.create(
                        raw_content=raw_content,
                        timestamp=timezone.now()
                    )
                    new_count += 1
            
            # Store the whole response for debugging
            if new_count == 0 and 'raw_response' in result:
                # If no structured listings were extracted but we have a raw response,
                # store the complete raw response as a single analysis
                complete_response = result.get('raw_response')
                if isinstance(complete_response, dict):
                    response_content = complete_response.get('response')
                    if isinstance(response_content, str) and response_content:
                        LyzrTokenAnalysis.objects.create(
                            raw_content=response_content,
                            timestamp=timezone.now()
                        )
                        new_count += 1
                        logger.info(f"Stored complete raw response as analysis")
            
            return {
                'success': True,
                'new_count': new_count,
                'raw_response': result.get('raw_response')
            }
        
        except Exception as e:
            logger.exception(f"Error syncing token listings from Lyzr agent: {e}")
            return {
                'success': False,
                'error': str(e),
                'new_count': 0
            }
    
    @staticmethod
    def get_recent_analyses(limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recent token analyses from the database
        
        Args:
            limit: Maximum number of analyses to return
            
        Returns:
            List of token analyses with processed content
        """
        analyses = LyzrTokenAnalysis.objects.all().order_by('-timestamp')[:limit]
        
        result = []
        for analysis in analyses:
            processed_content = LyzrTokenListingService.process_content(analysis.raw_content)
            result.append({
                'id': analysis.id,
                'timestamp': analysis.timestamp,
                'raw_content': analysis.raw_content,
                'processed': processed_content
            })
        
        return result
    
    @staticmethod
    def process_content(raw_content: str) -> Dict[str, Any]:
        """
        Process raw content from Lyzr agent to extract structured data
        
        Args:
            raw_content: Raw markdown/text content from Lyzr
            
        Returns:
            Dict containing extracted token data
        """
        if not raw_content:
            return {"tokens": [], "count": 0}
        
        logger.info(f"Processing content of length {len(raw_content)}")
        logger.info(f"Content sample: {raw_content[:200]}...")
        
        tokens = []
        
        # Use simplified pattern to find tokens
        # Look for token entries that start with ### Token N: **Name (SYMBOL)**
        token_pattern = r'###\s*Token\s*\d+:\s*\*\*([^*(]+?)(?:\s*\(([^)]+)\))?\*\*'
        token_matches = list(re.finditer(token_pattern, raw_content))
        
        if token_matches:
            logger.info(f"Found {len(token_matches)} tokens using ### Token pattern")
            
            for i, match in enumerate(token_matches):
                token_name = match.group(1).strip()
                token_symbol = match.group(2).strip() if match.group(2) else None
                
                # Find the section for this token
                start_pos = match.end()
                end_pos = len(raw_content)
                
                # Find the next token section if exists
                if i < len(token_matches) - 1:
                    end_pos = token_matches[i+1].start()
                
                section_text = raw_content[start_pos:end_pos].strip()
                
                # Extract listing date
                listing_date = None
                date_match = re.search(r'\*\*Listing Date\*\*:\s*([^\n]+)', section_text)
                if date_match:
                    listing_date = date_match.group(1).strip()
                
                # Extract category
                category = None
                category_match = re.search(r'\*\*Category\*\*:\s*([^\n]+)', section_text)
                if category_match:
                    category = category_match.group(1).strip()
                
                # Extract key points
                key_points = []
                points_pattern = re.compile(r'-\s*([^\n]+)')
                key_points_section = re.search(r'\*\*Key Selling Points\*\*:(.*?)(?=\*\*Target|\Z)', section_text, re.DOTALL)
                if key_points_section:
                    points_text = key_points_section.group(1).strip()
                    for point_match in points_pattern.finditer(points_text):
                        point = re.sub(r'\*\*|\*', '', point_match.group(1)).strip()
                        if point:
                            key_points.append(point)
                
                # Extract target audience
                target_audience = []
                audience_section = re.search(r'\*\*Target Audience\*\*:(.*?)(?=####|\Z)', section_text, re.DOTALL)
                if audience_section:
                    audience_text = audience_section.group(1).strip()
                    for point_match in points_pattern.finditer(audience_text):
                        point = re.sub(r'\*\*|\*', '', point_match.group(1)).strip()
                        if point:
                            target_audience.append(point)
                
                # Extract visual concepts
                visual_concepts = []
                concept_pattern = re.compile(r'####\s*Visual Concept\s*(\d+):(.*?)(?=####|\Z)', re.DOTALL)
                for concept_match in concept_pattern.finditer(section_text):
                    concept_num = concept_match.group(1)
                    concept_text = concept_match.group(2).strip()
                    
                    headline = None
                    headline_match = re.search(r'\*\*Headline\*\*:\s*"?([^"\n]+)"?', concept_text)
                    if headline_match:
                        headline = headline_match.group(1).strip()
                    
                    subheadline = None
                    subheadline_match = re.search(r'\*\*Subheadline\*\*:\s*"?([^"\n]+)"?', concept_text)
                    if subheadline_match:
                        subheadline = subheadline_match.group(1).strip()
                    
                    description = None
                    description_match = re.search(r'\*\*Description\*\*:\s*([^\n]+)', concept_text)
                    if description_match:
                        description = description_match.group(1).strip()
                    
                    visual_concepts.append({
                        "title": f"Visual Concept {concept_num}",
                        "headline": headline,
                        "subheadline": subheadline,
                        "description": description
                    })
                
                tokens.append({
                    'name': token_name,
                    'symbol': token_symbol,
                    'listing_date': listing_date,
                    'category': category,
                    'key_points': key_points,
                    'target_audience': target_audience,
                    'visual_concepts': visual_concepts
                })
        
        # If no tokens found, fall back to a simpler pattern
        if not tokens:
            logger.info("No tokens found with ### Token pattern, trying simpler bold pattern")
            
            # Looking for tokens in the format **TokenName (SYMBOL)**
            token_pattern = r'\*\*([^*:]+?)(?:\s*\(([^)]+)\))?\*\*'
            token_matches = list(re.finditer(token_pattern, raw_content))
            
            filtered_tokens = []
            for match in token_matches:
                token_text = match.group(1).strip()
                token_symbol = match.group(2).strip() if match.group(2) else None
                
                # Skip common non-token bold text
                if any(text.lower() in token_text.lower() for text in [
                    'listing date', 'category', 'key selling points', 'target audience',
                    'description', 'headline', 'subheadline', 'visual concept'
                ]):
                    continue
                    
                filtered_tokens.append((token_text, token_symbol))
            
            # Remove duplicates and create token objects
            seen = set()
            for name, symbol in filtered_tokens:
                if (name, symbol) not in seen:
                    seen.add((name, symbol))
                    tokens.append({
                        'name': name,
                        'symbol': symbol,
                        'listing_date': None,
                        'category': None,
                        'key_points': [],
                        'target_audience': [],
                        'visual_concepts': []
                    })
        
        # Log results
        logger.info(f"Extracted {len(tokens)} tokens from content")
        for i, token in enumerate(tokens):
            logger.info(f"Token {i+1}: {token['name']} ({token['symbol'] or 'No symbol'}) - Listed: {token['listing_date'] or 'Unknown'}")
            if token.get('key_points'):
                logger.info(f"  - {len(token['key_points'])} key points found")
            if token.get('visual_concepts'):
                logger.info(f"  - {len(token['visual_concepts'])} visual concepts found")
        
        return {
            'tokens': tokens,
            'count': len(tokens)
        } 