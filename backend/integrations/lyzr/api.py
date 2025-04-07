import json
import logging
import requests
from typing import Dict, Any, List, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

class LyzrAgentClient:
    """
    Client for communicating with Lyzr AI agent API
    """
    def __init__(self, agent_id: str, user_id: str = None):
        """
        Initialize Lyzr agent client
        
        Args:
            agent_id: The ID of the Lyzr agent to use
            user_id: The user ID to use when calling the Lyzr API
        """
        # Move settings access to instance level
        self.base_url = getattr(settings, 'LYZR', {}).get('BASE_URL', "https://agent-prod.studio.lyzr.ai/v3/inference/chat/")
        self.api_key = getattr(settings, 'LYZR', {}).get('API_KEY', "sk-default-fCMshx4ANk6YwBSlv5f2348a59ydsRum")
        self.agent_id = agent_id
        self.user_id = user_id or getattr(settings, 'LYZR', {}).get('DEFAULT_USER_ID', "jackyrusli180@gmail.com")
        
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        })
    
    def query_agent(self, message: str = "", session_id: Optional[str] = None) -> Dict[Any, Any]:
        """
        Send a query to the Lyzr agent
        
        Args:
            message: The message to send to the agent
            session_id: Optional session ID for conversation continuity
            
        Returns:
            The agent's response as a dictionary
        """
        if not session_id:
            session_id = self.agent_id
            
        payload = {
            "user_id": self.user_id,
            "agent_id": self.agent_id,
            "session_id": session_id,
            "message": message
        }
        
        try:
            logger.info(f"Sending request to Lyzr agent at: {self.base_url}")
            logger.info(f"Request payload: {payload}")
            response = self.session.post(
                self.base_url,
                data=json.dumps(payload),
                timeout=120  # Increased timeout for longer AI processing
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error querying Lyzr agent: {e}")
            return {"error": str(e)}


class OKXTokenListingAgent:
    """
    Specialized client for the OKX Token Listing agent
    """
    def __init__(self):
        # Move settings access to instance level
        self.agent_id = getattr(settings, 'LYZR', {}).get('OKX_TOKEN_AGENT_ID', "67eaa2e30b51720d14cc5c8e")
        self.client = LyzrAgentClient(agent_id=self.agent_id)
    
    def get_latest_token_listings(self) -> Dict[str, Any]:
        """
        Get the latest token listings from OKX via the Lyzr agent
        
        Returns:
            A dictionary containing the parsed response from the agent
        """
        # Initial message to trigger the agent to look for latest listings
        message = "Research the latest token listings on OKX from the past 30 days only. For each token, provide detailed information including name, symbol, listing date, category, key selling points, target audience, and create 3 visual marketing concepts with headlines for each token."
        
        try:
            logger.info(f"Fetching latest token listings from Lyzr agent with ID: {self.agent_id}")
            response = self.client.query_agent(message=message)
            
            # Check if there's an error in the response
            if "error" in response:
                logger.error(f"Error from Lyzr agent: {response['error']}")
                return {
                    "success": False,
                    "error": response["error"],
                    "listings": []
                }
            
            # Extract the actual content from the response
            parsed_listings = self._parse_response(response)
            logger.info(f"Successfully parsed {len(parsed_listings)} listings from Lyzr response")
            
            return {
                "success": True,
                "raw_response": response,
                "listings": parsed_listings
            }
            
        except Exception as e:
            logger.exception(f"Unexpected error with Lyzr agent: {e}")
            return {
                "success": False,
                "error": str(e),
                "listings": []
            }
    
    def _parse_response(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse the response from the Lyzr agent to extract token listings
        
        Args:
            response: The raw response from the Lyzr agent
            
        Returns:
            A list of token listings extracted from the response
        """
        try:
            # Log the entire response structure for debugging
            logger.info(f"Response keys: {list(response.keys())}")
            
            # First, check if we have a "response" key with string content
            if "response" in response:
                if isinstance(response["response"], str):
                    content = response["response"]
                    logger.info(f"Found content in response string ({len(content)} chars)")
                    
                    # Return the raw content as a list item
                    return [{"raw_content": content}]
                elif isinstance(response["response"], dict):
                    if "content" in response["response"]:
                        content = response["response"]["content"]
                        logger.info(f"Found content in response.content ({len(content)} chars)")
                        return [{"raw_content": content}]
            
            # Try other common response formats
            if "module_outputs" in response:
                logger.info("Found module_outputs in response")
            
            # If all else fails, convert the entire response to a string and use that
            logger.warning("Could not find structured content, using raw response as content")
            try:
                raw_response_str = json.dumps(response, indent=2)
                return [{"raw_content": raw_response_str}]
            except Exception as json_err:
                logger.error(f"Error converting response to JSON: {json_err}")
                return [{"raw_content": str(response)}]
            
        except Exception as e:
            logger.error(f"Error parsing Lyzr response: {e}")
            # Print a stack trace to help with debugging
            import traceback
            logger.error(traceback.format_exc())
            return [] 