# AWS Setup Guide for Sync Service

To use the **S3 Plugin**, you need to configure an S3 Bucket and an IAM User with the correct permissions.

## 1. Create an S3 Bucket
1.  Go to the [Amazon S3 Console](https://s3.console.aws.amazon.com/s3/).
2.  Click **Create bucket**.
3.  Name your bucket (e.g., `openwebui-docs`).
4.  Select a Region (e.g., `us-east-1`).
5.  Keep default settings (Block Public Access ON) unless you specifically need public access.
6.  Click **Create bucket**.

## 2. Create an IAM Policy
It's best practice to create a policy restricted to just this bucket.

1.  Go to the [IAM Console > Policies](https://us-east-1.console.aws.amazon.com/iamv2/home#/policies).
2.  Click **Create policy**.
3.  Choose **JSON** and paste the following (replace `YOUR_BUCKET_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```
4.  Name the policy (e.g., `OpenWebUI-S3-Read`).
5.  Click **Create policy**.

## 3. Create an IAM User
1.  Go to [IAM Console > Users](https://us-east-1.console.aws.amazon.com/iamv2/home#/users).
2.  Click **Create user**.
3.  Name the user (e.g., `openwebui-sync-user`).
4.  Click **Next**.
5.  Select **Attach policies directly**.
6.  Search for and select the policy you created (`OpenWebUI-S3-Read`).
7.  Click **Next**, then **Create user**.

## 4. Get Access Keys
1.  Click on the newly created user setup.
2.  Go to the **Security credentials** tab.
3.  Scroll to **Access keys**.
4.  Click **Create access key**.
5.  Select **Application running outside AWS** (or Local code).
6.  Copy the **Access Key ID** and **Secret Access Key**.

## 5. Configure Environment
Update your `.env` file (or Docker environment) with these credentials:

```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

---

## 6. Set Up SQS for Real-Time Sync (Optional but Recommended)

The S3 Plugin supports a **hybrid sync** model. Without SQS it will still work
(list-objects fallback), but for real-time detection of file changes you need an
SQS queue wired to your S3 bucket.

### 6a. Create an SQS Queue
1.  Go to the [Amazon SQS Console](https://console.aws.amazon.com/sqs/).
2.  Click **Create queue**.
3.  Choose **Standard** (not FIFO).
4.  Name the queue (e.g., `openwebui-s3-events`).
5.  Set **Receive message wait time** to **5 seconds** (enables long polling).
6.  Leave other defaults and click **Create queue**.
7.  Copy the **Queue URL** — you will need it later.

### 6b. Allow S3 to Send Messages to SQS
On the SQS queue page, go to **Access policy** and add the following statement
(replace `YOUR_BUCKET_NAME`, `YOUR_AWS_ACCOUNT_ID`, and `YOUR_QUEUE_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "s3.amazonaws.com"
            },
            "Action": "SQS:SendMessage",
            "Resource": "arn:aws:sqs:*:YOUR_AWS_ACCOUNT_ID:YOUR_QUEUE_NAME",
            "Condition": {
                "ArnLike": {
                    "aws:SourceArn": "arn:aws:s3:::YOUR_BUCKET_NAME"
                }
            }
        }
    ]
}
```

### 6c. Configure S3 Event Notifications
1.  Go to your S3 bucket in the [S3 Console](https://s3.console.aws.amazon.com/s3/).
2.  Go to **Properties** → **Event notifications** → **Create event notification**.
3.  Name (e.g., `send-to-sqs`).
4.  Under **Event types**, select:
    -   `s3:ObjectCreated:*`
    -   `s3:ObjectRemoved:*`
5.  Under **Destination**, choose **SQS queue** and select the queue you created.
6.  Click **Save changes**.

### 6d. Update IAM Policy
Add SQS permissions to your IAM policy so the sync service can read and delete
messages. Update the policy created in **Step 2** to include:

```json
{
    "Effect": "Allow",
    "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
    ],
    "Resource": "arn:aws:sqs:*:YOUR_AWS_ACCOUNT_ID:YOUR_QUEUE_NAME"
}
```

### 6e. Configure the SQS Queue URL
Add to your `.env` file or Docker environment:

```bash
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/openwebui-s3-events
```

Or set it in the **plugin config** via the Sync Service API / Dashboard under the
**SQS Queue URL** field when creating/editing the S3 plugin instance.

