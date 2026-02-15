from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import SourcePluginConfig

def init_db():
    create_db_and_tables()
    
    with Session(engine) as session:
        # Check if S3 plugin exists
        statement = select(SourcePluginConfig).where(SourcePluginConfig.name == "s3-main")
        result = session.exec(statement).first()
        
        if not result:
            print("Seeding S3 Plugin configuration...")
            import os
            
            # Read from Env Vars
            bucket_name = os.environ.get("S3_BUCKET_NAME", "my-test-bucket")
            region_name = os.environ.get("AWS_REGION", "us-east-1")
            
    
            s3_config = SourcePluginConfig(
                name="s3-main",
                module_name="app.plugins.s3",
                class_name="S3Plugin",
                is_active=True,
                config={
                    "bucket_name": bucket_name,
                    "region_name": region_name
                }
            )
            session.add(s3_config)
            session.commit()
            print("S3 Plugin seeded.")
        else:
            print("S3 Plugin already exists. Updating config...")
            import os
            
            # Read from Env Vars
            bucket_name = os.environ.get("S3_BUCKET_NAME", "my-test-bucket")
            region_name = os.environ.get("AWS_REGION", "us-east-1")
            
            result.config = {
                "bucket_name": bucket_name,
                "region_name": region_name
            }
            session.add(result)
            session.commit()
            print("S3 Plugin config updated.")

if __name__ == "__main__":
    init_db()
