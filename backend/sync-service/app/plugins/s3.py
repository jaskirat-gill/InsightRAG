import boto3
from typing import Any, Dict, Generator, List, Optional
from app.plugins.interface import SourcePlugin, FileEvent
from urllib.parse import unquote_plus
import json
import time
import os

class S3Plugin(SourcePlugin):
    """
    Plugin for syncing files from an AWS S3 bucket.

    Supports a hybrid sync model:
      1. Real-time: Poll SQS for S3 event notifications (created/deleted).
      2. Fallback / Reconciliation: List all objects in the bucket.

    When an SQS queue URL is configured the sync() method will drain the
    queue first, then fall through to a full list-objects scan so that any
    events missed while the service was offline are still picked up.
    """

    # -- Configuration --------------------------------------------------------

    @classmethod
    def config_schema(cls) -> list:
        return [
            {
                "name": "bucket_name",
                "label": "Bucket Name",
                "type": "text",
                "required": True,
                "placeholder": "my-s3-bucket"
            },
            {
                "name": "region_name",
                "label": "AWS Region",
                "type": "text",
                "required": False,
                "placeholder": "us-east-1"
            },
            {
                "name": "aws_access_key_id",
                "label": "Access Key ID",
                "type": "password",
                "required": False,
                "placeholder": "AKIA..."
            },
            {
                "name": "aws_secret_access_key",
                "label": "Secret Access Key",
                "type": "password",
                "required": False,
                "placeholder": "••••••••"
            },
            {
                "name": "sqs_queue_url",
                "label": "SQS Queue URL",
                "type": "text",
                "required": False,
                "placeholder": "https://sqs.us-east-1.amazonaws.com/..."
            },
        ]

    def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the S3 plugin.

        Config keys (all fallback to env vars if omitted):
            bucket_name         / S3_BUCKET_NAME
            aws_access_key_id   / AWS_ACCESS_KEY_ID
            aws_secret_access_key / AWS_SECRET_ACCESS_KEY
            region_name         / AWS_REGION
            sqs_queue_url       / SQS_QUEUE_URL
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

        # Shared kwargs for boto3 clients
        boto_kwargs: Dict[str, Any] = {
            "aws_access_key_id": self.aws_access_key,
            "aws_secret_access_key": self.aws_secret_key,
            "region_name": self.region_name,
        }

        self.s3_client = boto3.client('s3', **boto_kwargs)
        self.sqs_client = boto3.client('sqs', **boto_kwargs) if self.sqs_queue_url else None

    def validate_config(self, config: Dict[str, Any]) -> None:
        pass  # Validation performed in initialize after resolving env vars

    # -- Connection -----------------------------------------------------------

    def test_connection(self) -> bool:
        """Check if we can access the bucket (HeadBucket)."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except Exception as e:
            print(f"S3 Connection failed: {e}")
            return False

    # -- Sync -----------------------------------------------------------------

    def sync(self) -> Generator[FileEvent, None, None]:
        """
        Hybrid sync strategy:
          1. If SQS is configured, drain the queue for real-time events.
          2. Always follow up with a full list-objects scan (reconciliation).
        """
        # Phase 1 — Real-time SQS events
        if self.sqs_client and self.sqs_queue_url:
            print("[S3Plugin] Polling SQS for real-time events...")
            yield from self._poll_sqs_events()

        # Phase 2 — Reconciliation: full bucket scan
        print("[S3Plugin] Running list-objects reconciliation scan...")
        yield from self._list_objects_scan()

    # -- Private helpers ------------------------------------------------------

    def _poll_sqs_events(self) -> Generator[FileEvent, None, None]:
        """
        Long-poll the SQS queue until it is empty. For each message we parse
        the S3 event notification, yield a FileEvent, and delete the message
        from the queue so it is not reprocessed.
        """
        while True:
            response = self.sqs_client.receive_message(
                QueueUrl=self.sqs_queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=5,           # long-poll for efficiency
                MessageAttributeNames=["All"],
            )

            messages = response.get("Messages", [])
            if not messages:
                # Queue is drained for now
                break

            for message in messages:
                receipt_handle = message["ReceiptHandle"]
                events = self._parse_s3_event(message.get("Body", "{}"))

                for event in events:
                    yield event

                # Delete the message after successful processing
                try:
                    self.sqs_client.delete_message(
                        QueueUrl=self.sqs_queue_url,
                        ReceiptHandle=receipt_handle,
                    )
                except Exception as e:
                    print(f"[S3Plugin] Failed to delete SQS message: {e}")

    def _parse_s3_event(self, raw_body: str) -> List[FileEvent]:
        """
        Parse an SQS message body into FileEvent(s).

        Handles two delivery formats:
          - Direct S3 event notification (contains "Records" at top level).
          - SNS-wrapped S3 event (the S3 event JSON is nested inside the
            SNS "Message" field as a string).
        """
        events: List[FileEvent] = []

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            print(f"[S3Plugin] Skipping non-JSON SQS message")
            return events

        # --- Handle SNS-wrapped messages ---
        if "Type" in body and body.get("Type") == "Notification":
            try:
                body = json.loads(body.get("Message", "{}"))
            except json.JSONDecodeError:
                print("[S3Plugin] Failed to parse SNS Message payload")
                return events

        # --- Handle S3 test event (sent when notifications are first configured) ---
        if body.get("Event") == "s3:TestEvent":
            print("[S3Plugin] Received S3 test event — skipping")
            return events

        records = body.get("Records", [])
        for record in records:
            event_name: str = record.get("eventName", "")
            s3_info = record.get("s3", {})
            bucket = s3_info.get("bucket", {}).get("name", "")
            key_raw = s3_info.get("object", {}).get("key", "")
            key = unquote_plus(key_raw)

            # Skip directory markers
            if not key or key.endswith("/"):
                continue

            # Only process events for our configured bucket
            if bucket and bucket != self.bucket_name:
                continue

            # Map S3 event names to our event types
            if "ObjectCreated" in event_name:
                event_type = "created"
            elif "ObjectRemoved" in event_name:
                event_type = "deleted"
            else:
                # Other events (e.g. Restore, Tagging) — skip
                continue

            etag = s3_info.get("object", {}).get("eTag")
            size = s3_info.get("object", {}).get("size")
            event_time = record.get("eventTime")

            events.append(
                FileEvent(
                    source_type="s3",
                    event_type=event_type,
                    file_path=key,
                    content=None,
                    metadata={
                        "etag": etag,
                        "size": size,
                        "event_name": event_name,
                        "event_time": event_time,
                        "bucket": bucket,
                    },
                    timestamp=time.time(),
                )
            )

        return events

    def _list_objects_scan(self) -> Generator[FileEvent, None, None]:
        """
        Full bucket scan via ListObjectsV2 (paginated).
        Acts as the reconciliation / fallback sync path.
        """
        paginator = self.s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=self.bucket_name):
            if 'Contents' not in page:
                continue

            for obj in page['Contents']:
                key = obj['Key']
                if key.endswith('/'):
                    continue

                yield FileEvent(
                    source_type="s3",
                    event_type="present",
                    file_path=key,
                    content=None,
                    metadata={
                        "etag": obj.get('ETag'),
                        "last_modified": str(obj.get('LastModified')),
                        "size": obj.get('Size'),
                    },
                    timestamp=time.time(),
                )

    # -- Download -------------------------------------------------------------

    def download_file(self, file_path: str, local_destination: str) -> None:
        """Download the file from S3."""
        try:
            os.makedirs(os.path.dirname(local_destination), exist_ok=True)
            self.s3_client.download_file(self.bucket_name, file_path, local_destination)
        except Exception as e:
            print(f"Failed to download {file_path}: {e}")
            raise
