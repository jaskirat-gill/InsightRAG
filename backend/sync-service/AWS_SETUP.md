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
