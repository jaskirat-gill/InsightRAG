import boto3
from typing import Any, Dict, Generator, List
from app.plugins.interface import SourcePlugin, FileEvent
import json
import time
import os

class S3Plugin(SourcePlugin):
    """
    Plugin for syncing files from an AWS S3 bucket.
    """

    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the S3 plugin.
        
        Config:
            bucket_name: Name of the S3 bucket (Optional if S3_BUCKET_NAME env var set).
            aws_access_key_id: (Optional) AWS Access Key.
            aws_secret_access_key: (Optional) AWS Secret Key.
            region_name: (Optional) AWS Region.
        """
        self.config = config
        
        # Resolve configuration with priority: Config > Env Var
        self.bucket_name = config.get('bucket_name') or os.environ.get('S3_BUCKET_NAME')
        self.aws_access_key = config.get('aws_access_key_id') or os.environ.get('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = config.get('aws_secret_access_key') or os.environ.get('AWS_SECRET_ACCESS_KEY')
        self.region_name = config.get('region_name') or os.environ.get('AWS_REGION')
        self.sqs_queue_url = config.get('sqs_queue_url') or os.environ.get('SQS_QUEUE_URL')

        if not self.bucket_name:
            raise ValueError("bucket_name is required (in config or S3_BUCKET_NAME env var).")

        # Initialize Boto3 Client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.region_name
        )
        
        if self.sqs_queue_url:
            self.sqs_client = boto3.client(
                'sqs',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.region_name
            )

    def validate_config(self, config: Dict[str, Any]) -> None:
        pass # Validation performed in initialize after resolving env vars

    def test_connection(self) -> bool:
        """
        Check if we can access the bucket (Head Bucket).
        """
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except Exception as e:
            print(f"S3 Connection failed: {e}")
            return False

    def sync(self) -> Generator[FileEvent, None, None]:
        """
        Sync strategy:
        1. If SQS is configured, poll for events.
        2. If not, (or as a fallback/initial sync), list objects.
        
        For MVP, we will implement List Objects (Delta Sync style).
        """
        # TODO: Implement SQS polling in a loop or separate method for real-time.
        # For this MVP sync implementation, we'll list objects.
        
        paginator = self.s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=self.bucket_name):
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                # Skip directories
                if key.endswith('/'):
                    continue
                    
                # In a real app, we'd check ETag/LastModified against DB to see if it's new.
                # For now, we yield everything.
                
                yield FileEvent(
                    source_type="s3",
                    event_type="present",
                    file_path=key,
                    content=None, # Content is lazy loaded via download_file
                    metadata={
                        "etag": obj.get('ETag'),
                        "last_modified": str(obj.get('LastModified')),
                        "size": obj.get('Size')
                    },
                    timestamp=time.time()
                )

    def download_file(self, file_path: str, local_destination: str) -> None:
        """
        Download the file from S3.
        """
        try:
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(local_destination), exist_ok=True)
            self.s3_client.download_file(self.bucket_name, file_path, local_destination)
        except Exception as e:
            print(f"Failed to download {file_path}: {e}")
            raise
