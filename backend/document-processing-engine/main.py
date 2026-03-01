# This file is kept for backward compatibility.
# The document-processing-engine now runs as a Celery worker (see worker.py).
# To run manually: celery -A worker worker --loglevel=info

from worker import celery_app

if __name__ == "__main__":
    celery_app.worker_main(["worker", "--loglevel=info", "--concurrency=2"])
