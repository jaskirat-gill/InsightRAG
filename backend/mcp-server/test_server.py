#!/usr/bin/env python3
"""Test script for MCP server"""

import sys
import os

# CRITICAL: Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

print(f"Python path: {current_dir}")
print(f"Files in directory: {os.listdir(current_dir)}")

# Now imports should work
try:
    from embeddings import generate_embedding
    from search import search_qdrant
    print("✓ Imports successful")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    print("\nMake sure these files exist in the same directory:")
    print("  - embeddings.py")
    print("  - search.py")
    sys.exit(1)

def main():
    print("=" * 60)
    print("MCP Server Test Suite")
    print("=" * 60)
    
    # Test 1: Embedding Generation
    print("\n[1/3] Testing embedding generation...")
    try:
        test_query = "How do I authenticate?"
        embedding = generate_embedding(test_query)
        print(f"✓ Generated {len(embedding)}-dimensional embedding")
        assert len(embedding) == 384, f"Expected 384-dim, got {len(embedding)}"
    except Exception as e:
        print(f"✗ Embedding generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Qdrant Connection
    print("\n[2/3] Testing Qdrant connection...")
    try:
        from search import get_qdrant_client, COLLECTION_NAME
        client = get_qdrant_client()
        collections = [c.name for c in client.get_collections().collections]
        print(f"✓ Connected to Qdrant")
        print(f"  Available collections: {collections}")
        
        if COLLECTION_NAME in collections:
            print(f"✓ Collection '{COLLECTION_NAME}' exists")
            info = client.get_collection(COLLECTION_NAME)
            print(f"  Total points: {info.points_count}")
            
            if info.points_count == 0:
                print("⚠ Warning: Collection is empty! No documents indexed yet.")
                print("  Run document-processing-engine first to index some documents.")
                return False
        else:
            print(f"✗ Collection '{COLLECTION_NAME}' not found!")
            print(f"  Available: {collections}")
            return False
            
    except Exception as e:
        print(f"✗ Qdrant connection failed: {e}")
        print("  Make sure Qdrant is running:")
        print("    - Docker: docker-compose up qdrant")
        print("    - Check: curl http://localhost:6333/collections")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Search
    print("\n[3/3] Testing search...")
    try:
        results = search_qdrant(
            query_vector=embedding,
            top_k=3,
            score_threshold=0.3  # Lower threshold for testing
        )
        
        print(f"✓ Search completed successfully")
        print(f"  Found {len(results)} results\n")
        
        if len(results) == 0:
            print("⚠ No results found")
            print("  Possible reasons:")
            print("    1. No documents indexed yet")
            print("    2. Score threshold too high (try 0.3)")
            print("    3. Query doesn't match indexed content")
        else:
            for i, result in enumerate(results, 1):
                print(f"Result {i}:")
                print(f"  Score: {result['score']:.3f}")
                print(f"  Document ID: {result.get('document_id', 'N/A')[:8]}...")
                print(f"  Section: {result.get('section_title', 'N/A')}")
                print(f"  Page: {result.get('page_number', 'N/A')}")
                print(f"  Text: {result['chunk_text'][:150]}...")
                print()
        
        return True
        
    except Exception as e:
        print(f"✗ Search failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting tests...\n")
    success = main()
    
    print("=" * 60)
    if success:
        print("✓ All tests passed!")
        print("\nNext steps:")
        print("  1. Test MCP server: python server.py")
        print("  2. Test with Claude Desktop (see docs)")
    else:
        print("✗ Some tests failed")
        print("\nTroubleshooting:")
        print("  1. Install deps: pip install -r requirements.txt")
        print("  2. Start Qdrant: docker-compose up qdrant")
        print("  3. Index docs: docker-compose up document-processing-engine")
    print("=" * 60)
    
    sys.exit(0 if success else 1)