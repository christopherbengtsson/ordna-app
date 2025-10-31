#!/usr/bin/env python3
"""
Upload Swedish words to Supabase word_dictionary table.

This script reads words from dictionary_sv.txt and uploads them to a Supabase
database, replacing all existing Swedish words (language='sv').

Usage:
    python upload_to_supabase.py [--input FILE] [--batch-size SIZE] [--dry-run]

Environment Variables (required):
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_KEY - Your Supabase service role key (not anon key!)
"""

import os
import sys
import time
import argparse
from typing import List
from supabase import create_client, Client


# Configuration
DEFAULT_INPUT_FILE = "dictionary_sv.txt"
DEFAULT_BATCH_SIZE = 10000  # Optimized for production: fewer API calls, still safe
BATCH_DELAY = 0.1  # Small delay between batches to avoid rate limits (seconds)
MAX_RETRIES = 3  # Retry failed batches
LANGUAGE = "sv"  # Swedish


def load_words_from_file(file_path: str) -> List[str]:
    """Load words from text file, one word per line."""
    print(f"📖 Reading words from: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            words = [line.strip() for line in f if line.strip()]

        print(f"✓ Loaded {len(words):,} words from file")
        return words

    except FileNotFoundError:
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)


def get_supabase_client() -> Client:
    """Create and return Supabase client using environment variables."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("❌ Error: Missing required environment variables")
        print("\nRequired:")
        print("  SUPABASE_URL - Your Supabase project URL")
        print("  SUPABASE_KEY - Your Supabase service role key")
        print("\nExample:")
        print("  export SUPABASE_URL='https://xxxxx.supabase.co'")
        print("  export SUPABASE_KEY='eyJxxx...'")
        sys.exit(1)

    print(f"🔗 Connecting to Supabase: {supabase_url}")

    try:
        client = create_client(supabase_url, supabase_key)
        print("✓ Connected to Supabase")
        return client
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        sys.exit(1)


def truncate_swedish_words(supabase: Client, dry_run: bool = False) -> int:
    """Delete all existing Swedish words from the database."""
    print(f"\n🗑️  Deleting existing Swedish words (language='{LANGUAGE}')...")

    if dry_run:
        print("   [DRY RUN] Would delete existing words")
        return 0

    try:
        # First, count how many words we're about to delete
        result = (
            supabase.table("word_dictionary")
            .select("*", count="exact")
            .eq("language", LANGUAGE)
            .execute()
        )
        count = result.count if hasattr(result, 'count') else len(result.data) if result.data else 0

        if count > 0:
            print(f"   Found {count:,} existing words to delete")

            # Delete all Swedish words
            delete_result = (
                supabase.table("word_dictionary")
                .delete()
                .eq("language", LANGUAGE)
                .execute()
            )
            print(f"✓ Deleted {count:,} existing words")
            return count
        else:
            print("✓ No existing words to delete")
            return 0

    except Exception as e:
        print(f"❌ Error deleting existing words: {e}")
        print("   Continuing with insert anyway...")
        return 0


def insert_batch_with_retry(supabase: Client, batch_data: List[dict], batch_num: int, max_retries: int = MAX_RETRIES) -> bool:
    """Insert a single batch with retry logic."""
    for attempt in range(max_retries):
        try:
            response = (
                supabase.table("word_dictionary")
                .insert(batch_data)
                .execute()
            )
            return True  # Success

        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 0.5  # Exponential backoff: 0.5s, 1s, 1.5s
                print(f"  ⚠️  Batch {batch_num} failed (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  ❌ Batch {batch_num} failed after {max_retries} attempts: {e}")
                return False

    return False


def batch_insert_words(supabase: Client, words: List[str], batch_size: int, dry_run: bool = False):
    """Insert words into Supabase in batches with retry logic and rate limiting."""
    total_words = len(words)
    total_batches = (total_words + batch_size - 1) // batch_size

    print(f"\n📤 Uploading {total_words:,} words in {total_batches} batches of {batch_size:,}...")
    print(f"   Rate limiting: {BATCH_DELAY}s delay between batches")
    print(f"   Retry policy: {MAX_RETRIES} attempts per batch")

    if dry_run:
        print("   [DRY RUN] Would upload words to Supabase")
        return

    start_time = time.time()
    inserted_count = 0
    failed_count = 0
    failed_batches = []

    for i in range(0, total_words, batch_size):
        batch = words[i:i + batch_size]
        batch_num = (i // batch_size) + 1

        # Prepare batch data
        batch_data = [{"language": LANGUAGE, "word": word} for word in batch]

        # Insert batch with retry logic
        success = insert_batch_with_retry(supabase, batch_data, batch_num)

        if success:
            inserted_count += len(batch)

            # Progress update
            elapsed = time.time() - start_time
            rate = inserted_count / elapsed if elapsed > 0 else 0
            progress = (inserted_count / total_words) * 100

            print(f"  ✓ Batch {batch_num}/{total_batches}: "
                  f"{inserted_count:,}/{total_words:,} words ({progress:.1f}%) | "
                  f"Rate: {rate:.0f} words/sec")
        else:
            failed_count += len(batch)
            failed_batches.append(batch_num)

        # Rate limiting: small delay between batches (except last one)
        if batch_num < total_batches:
            time.sleep(BATCH_DELAY)

    elapsed = time.time() - start_time

    print(f"\n{'='*60}")
    print(f"✅ Upload Complete")
    print(f"{'='*60}")
    print(f"Total words processed: {total_words:,}")
    print(f"Successfully inserted: {inserted_count:,}")
    print(f"Failed: {failed_count:,}")
    if failed_batches:
        print(f"Failed batch numbers: {failed_batches}")
    print(f"Time elapsed: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
    print(f"Average rate: {inserted_count/elapsed:.0f} words/sec")
    print(f"{'='*60}")


def verify_upload(supabase: Client):
    """Verify the upload by counting Swedish words in the database."""
    print(f"\n🔍 Verifying upload...")

    try:
        # Count total Swedish words
        result = (
            supabase.table("word_dictionary")
            .select("*", count="exact")
            .eq("language", LANGUAGE)
            .execute()
        )
        count = result.count if hasattr(result, 'count') else len(result.data) if result.data else 0

        print(f"✓ Database contains {count:,} Swedish words")

        # Show a few sample words
        sample = (
            supabase.table("word_dictionary")
            .select("word")
            .eq("language", LANGUAGE)
            .limit(5)
            .execute()
        )
        if sample.data:
            print(f"\n📋 Sample words from database:")
            for i, row in enumerate(sample.data, 1):
                print(f"  {i}. {row['word']}")

        return count

    except Exception as e:
        print(f"❌ Error verifying upload: {e}")
        return 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Upload Swedish words to Supabase word_dictionary table"
    )
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT_FILE,
        help=f"Input file with words (default: {DEFAULT_INPUT_FILE})"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Number of words per batch (default: {DEFAULT_BATCH_SIZE})"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate upload without actually modifying the database"
    )
    parser.add_argument(
        "--skip-truncate",
        action="store_true",
        help="Skip deleting existing words (append mode)"
    )

    args = parser.parse_args()

    print("="*60)
    print("Swedish Words → Supabase Uploader")
    print("="*60)

    if args.dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made")

    # Load words from file
    words = load_words_from_file(args.input)

    # Connect to Supabase
    supabase = get_supabase_client()

    # Truncate existing Swedish words (unless skipped)
    if not args.skip_truncate:
        truncate_swedish_words(supabase, dry_run=args.dry_run)
    else:
        print("\n⚠️  Skipping truncate - appending to existing words")

    # Batch insert words
    batch_insert_words(supabase, words, args.batch_size, dry_run=args.dry_run)

    # Verify upload
    if not args.dry_run:
        verify_upload(supabase)

    print("\n✨ Done!")


if __name__ == "__main__":
    main()
