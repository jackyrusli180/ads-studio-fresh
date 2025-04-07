import requests
from bs4 import BeautifulSoup
import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class OKXListingScraper:
    """
    Scraper for new token listings from OKX exchange announcements pages.
    """
    
    # URLs for OKX announcement pages
    SG_URL = "https://www.okx.com/en-sg/help/section/announcements-new-listings"
    TR_URL = "https://tr.okx.com/en/help/section/announcements-new-listings"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        })
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse the publication date from the announcement"""
        try:
            # Format: "Published on 28 Oct 2024"
            date_part = date_str.replace("Published on ", "").strip()
            return datetime.strptime(date_part, "%d %b %Y")
        except Exception as e:
            logger.error(f"Error parsing date '{date_str}': {e}")
            return None
    
    def _extract_token_symbol(self, title: str) -> Optional[str]:
        """Extract token symbol from announcement title"""
        # Common patterns in announcement titles
        patterns = [
            r"OKX to list (?:pre-market futures for |perpetual futures for |perpetual for |)([A-Z]+)",
            r"OKX to list ([A-Z]+) \(.*\) for spot trading",
            r"OKX to support new ([A-Z]+) spot trading pairs",
            r"OKX to support new ([A-Z]+)/[A-Z]+ spot trading pair",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title)
            if match:
                return match.group(1)
        
        # If we can't extract using patterns, try to find uppercase words that look like symbols
        words = title.split()
        for word in words:
            # Typical crypto symbols are 2-8 uppercase letters
            if re.match(r'^[A-Z]{2,8}$', word):
                return word
                
        return None
    
    def _parse_listing_type(self, title: str) -> str:
        """Determine the type of listing from the announcement title"""
        if "spot trading" in title.lower():
            return "spot"
        elif "futures" in title.lower():
            return "futures"
        elif "perpetual" in title.lower():
            return "perpetual"
        elif "margin trading" in title.lower():
            return "margin"
        else:
            return "unknown"
    
    def _scrape_page(self, url: str) -> List[Dict[str, Any]]:
        """Scrape a single OKX announcements page"""
        results = []
        
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all announcement items
            announcements = soup.select("ul > li")
            
            for announcement in announcements:
                try:
                    link_element = announcement.find('a')
                    if not link_element:
                        continue
                    
                    title = link_element.text.strip()
                    
                    # Skip delisting announcements
                    if "delist" in title.lower() or "suspension" in title.lower():
                        continue
                    
                    # Extract the publication date
                    date_str = announcement.select_one("span").text.strip() if announcement.select_one("span") else ""
                    
                    token_symbol = self._extract_token_symbol(title)
                    
                    if token_symbol:
                        listing_data = {
                            "title": title,
                            "symbol": token_symbol,
                            "publication_date": self._parse_date(date_str),
                            "source_url": url,
                            "listing_type": self._parse_listing_type(title),
                            "raw_date_str": date_str
                        }
                        results.append(listing_data)
                
                except Exception as e:
                    logger.error(f"Error processing announcement: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
        
        return results
    
    def scrape_listings(self) -> List[Dict[str, Any]]:
        """
        Scrape token listings from both OKX Singapore and Turkey sites
        """
        all_listings = []
        
        # Scrape Singapore site
        sg_listings = self._scrape_page(self.SG_URL)
        for listing in sg_listings:
            listing["region"] = "SG"
            all_listings.append(listing)
        
        # Scrape Turkey site
        tr_listings = self._scrape_page(self.TR_URL)
        for listing in tr_listings:
            listing["region"] = "TR"
            all_listings.append(listing)
        
        # Sort by publication date (newest first)
        all_listings.sort(key=lambda x: x.get("publication_date") or datetime.min, reverse=True)
        
        return all_listings

# Convenience function to get all listings
def get_okx_listings() -> List[Dict[str, Any]]:
    """Get all token listings from OKX announcement pages"""
    scraper = OKXListingScraper()
    return scraper.scrape_listings() 