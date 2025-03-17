"""
Meta Advertiser Account Configuration

This module contains the mapping between Meta advertiser accounts and their associated IDs
for application_id, object_store_url, and link URLs.
"""
from typing import Dict, List, Any, Optional

# Configuration for Meta advertiser accounts
META_ACCOUNTS: Dict[str, Dict[str, str]] = {
    # Global Paid Ads - TR (TRY Account)
    "570444632374496": {
        "name": "Global Paid Ads - TR (TRY Account)",
        "application_id_android": "3664790950472057",
        "application_id_ios": "3664790950472057",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okx.tr",
        "object_store_url_ios": "https://apps.apple.com/tr/app/okx-buy-bitcoin-crypto/id6475769800",
        "link_url": "https://okx-tr.onelink.me/acTx/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Global Paid Ads - TR
    "380552088147594": {
        "name": "Global Paid Ads - TR",
        "application_id_android": "3664790950472057",
        "application_id_ios": "3664790950472057",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okx.tr",
        "object_store_url_ios": "https://apps.apple.com/tr/app/okx-buy-bitcoin-crypto/id6475769800",
        "link_url": "https://okx-tr.onelink.me/acTx/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Growth Product - TR
    "1411816200203267": {
        "name": "Growth Product - TR",
        "application_id_android": "3664790950472057",
        "application_id_ios": "3664790950472057",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okx.tr",
        "object_store_url_ios": "https://apps.apple.com/tr/app/okx-buy-bitcoin-crypto/id6475769800",
        "link_url": "https://okx-tr.onelink.me/acTx/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - TR
    "2985722654918585": {
        "name": "LM - TR",
        "application_id_android": "3664790950472057",
        "application_id_ios": "3664790950472057",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okx.tr",
        "object_store_url_ios": "https://apps.apple.com/tr/app/okx-buy-bitcoin-crypto/id6475769800",
        "link_url": "https://okx-tr.onelink.me/acTx/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Global Paid Ads - BR (BRL)
    "1167209998332220": {
        "name": "Global Paid Ads - BR (BRL)",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Global Paid Ads - Team B
    "1102094014629915": {
        "name": "Global Paid Ads - Team B",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Global Paid Ads CR Markets
    "743156111224978": {
        "name": "Global Paid Ads CR Markets",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Growth Product Test
    "599607976078688": {
        "name": "Growth Product Test",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # Local Markets Brazil Branding (BRL)
    "538366219366552": {
        "name": "Local Markets Brazil Branding (BRL)",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - CIS New
    "555099863976918": {
        "name": "LM - CIS New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - EEA New
    "1309566753805470": {
        "name": "LM - EEA New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - SEA
    "564920126286022": {
        "name": "LM - SEA",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - VN New
    "1253056612476668": {
        "name": "LM - VN New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - AR New
    "1212964723145574": {
        "name": "LM - AR New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - AU New
    "604807321898261": {
        "name": "LM - AU New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - MENA Offshore
    "415624338285349": {
        "name": "LM - MENA Offshore",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    },
    
    # LM - AE New
    "1102444858208748": {
        "name": "LM - AE New",
        "application_id_android": "2045001539014194",
        "application_id_ios": "2045001539014194",
        "object_store_url_android": "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
        "object_store_url_ios": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
        "link_url": "https://okex.onelink.me/qjih/pid=metaweb_int&ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
    }
}

def get_meta_account_details(account_id: str) -> Optional[Dict[str, str]]:
    """
    Get account details for a given Meta account ID
    
    Args:
        account_id (str): The Meta account ID
        
    Returns:
        dict: Account details or None if not found
    """
    return META_ACCOUNTS.get(str(account_id))

def get_all_meta_accounts() -> List[Dict[str, str]]:
    """
    Get all Meta advertiser accounts for dropdown selection
    
    Returns:
        list: List of dicts with id and name for each account
    """
    return [
        {"id": account_id, "name": details["name"]}
        for account_id, details in META_ACCOUNTS.items()
    ] 