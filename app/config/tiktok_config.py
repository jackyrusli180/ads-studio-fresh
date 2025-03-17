"""
TikTok Advertiser Account Configuration

This module contains the mapping between TikTok advertiser accounts and their associated IDs
for app_id, identity_id, and landing page URLs.
"""
from typing import Dict, List, Any, Optional

# Configuration for TikTok advertiser accounts
TIKTOK_ACCOUNTS: Dict[str, Dict[str, str]] = {
    # OKX TR Official Ad Account
    "7428582544423075856": {
        "name": "OKX TR Official Ad Account",
        "identity_id": "7470495215439691783",
        "app_id_android": "7337674614505504770",
        "app_id_ios": "7337670998554165249",
        "landing_page_url": "https://okx-tr.onelink.me/acTx?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # OKX TR Growth Product Ad Account
    "7463377308125036561": {
        "name": "OKX TR Growth Product Ad Account",
        "identity_id": "7470489284983209992",
        "app_id_android": "7337674614505504770",
        "app_id_ios": "7337670998554165249",
        "landing_page_url": "https://okx-tr.onelink.me/acTx?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # Global Offshore Team V2
    "7463126039993188369": {
        "name": "Global Offshore Team V2",
        "identity_id": "7396963176740913168",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # Global Paid Ads - CR Markets
    "7437092540534243329": {
        "name": "Global Paid Ads - CR Markets",
        "identity_id": "7472383725671579666",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # Global Paid Ads - Offshore
    "7408760449430634512": {
        "name": "Global Paid Ads - Offshore",
        "identity_id": "7396963176740913168",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # Growth Product Team
    "7437092357411225617": {
        "name": "Growth Product Team",
        "identity_id": "7396963176740913168",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # OKX - Local Markets (AU)
    "7363273235116654593": {
        "name": "OKX - Local Markets (AU)",
        "identity_id": "7465574389670871057",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # OKX - Local Markets (BR)
    "7298990312133951490": {
        "name": "OKX - Local Markets (BR)",
        "identity_id": "7415423723434016776",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # OKX - Local Markets (UAE/MENA)
    "7375055731336151057": {
        "name": "OKX - Local Markets (UAE/MENA)",
        "identity_id": "7396963176740913168",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    },
    
    # Paid 1 Performance
    "7470858554736525313": {
        "name": "Paid 1 Performance",
        "identity_id": "7396963176740913168",
        "app_id_android": "7075260907458134017",
        "app_id_ios": "7072391891513294849",
        "landing_page_url": "https://okex.onelink.me/qjih?pid=tiktokweb&af_siteid=__CSITE__&c=__CAMPAIGN_NAME__&af_channel=__PLACEMENT__&af_c_id=__CAMPAIGN_ID__&af_adset=__AID_NAME__&af_adset_id=__AID__&af_ad=__CID_NAME__&af_ad_id=__CID__&af_ad_type=__CTYPE__&af_click_lookback=7d&deep_link_value=udl&ttclid=__CALLBACK_PARAM__&af_sub4=__CALLBACK_PARAM__&os=__OS__&af_ip=__IP__&af_ua=__UA__&af_lang=__SL__"
    }
}

def get_tiktok_account_details(advertiser_id: str) -> Optional[Dict[str, str]]:
    """
    Get account details for a given advertiser_id
    
    Args:
        advertiser_id (str): The TikTok advertiser ID
        
    Returns:
        dict: Account details or None if not found
    """
    return TIKTOK_ACCOUNTS.get(str(advertiser_id))

def get_all_tiktok_accounts() -> List[Dict[str, str]]:
    """
    Get all TikTok advertiser accounts for dropdown selection
    
    Returns:
        list: List of dicts with id and name for each account
    """
    return [
        {"id": advertiser_id, "name": details["name"]}
        for advertiser_id, details in TIKTOK_ACCOUNTS.items()
    ] 