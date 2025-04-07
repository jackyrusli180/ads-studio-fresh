from datetime import datetime
from enum import Enum

class AssetStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class AssetType(Enum):
    IMAGE = "image"
    VIDEO = "video"

class Asset:
    def __init__(self, id, name, file_path, type, status, created_at, metadata=None):
        self.id = id
        self.name = name
        self.file_path = file_path
        self.type = type
        self.status = status
        self.created_at = created_at
        self.metadata = metadata or {}
        self.approval_history = []

class ApprovalStage:
    def __init__(self, id, name, order, approvers):
        self.id = id
        self.name = name
        self.order = order
        self.approvers = approvers

class ApprovalAction:
    def __init__(self, id, asset_id, stage_id, action, comment, user_id, timestamp):
        self.id = id
        self.asset_id = asset_id
        self.stage_id = stage_id
        self.action = action
        self.comment = comment
        self.user_id = user_id
        self.timestamp = timestamp 