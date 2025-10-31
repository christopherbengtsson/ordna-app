import requests
from bs4 import BeautifulSoup
import time
import pickle
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

data = {
    'action': 'myprefix_scrollist',
    'unik': '0',
    'dir': 'ned',
    'dict': 'saol'
}
headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:63.0) Gecko/20100101 Firefox/63.0'
}

# Character normalization mapping for special characters in Swedish loanwords
CHAR_NORMALIZATION = {
    'ç': 'c', 'Ç': 'C',
    'à': 'a', 'À': 'A',
    'â': 'a', 'Â': 'A',
    'è': 'e', 'È': 'E',
    'ê': 'e', 'Ê': 'E',
    'ñ': 'n', 'Ñ': 'N',
    'ü': 'u', 'Ü': 'U',
    'æ': 'ä', 'Æ': 'Ä',  # Swedish: æ historically became ä
    'ô': 'o', 'Ô': 'O',
    'î': 'i', 'Î': 'I',
    'é': 'e', 'É': 'E',
    'ï': 'i', 'Ï': 'I',
    'ë': 'e', 'Ë': 'E',
}

# Global state for tracking progress
processed_urls = set()
all_word_forms = set()
current_unik = '0'  # Track pagination position for fast resume
output_file = "dictionary_sv.txt"
checkpoint_file = "checkpoint.pkl"

# Resume safety configuration
RESUME_SAFETY_BUFFER = 300  # Go back ~10 pages worth of IDs on resume
MAX_VERIFICATION_URLS = 500  # Maximum URLs to check during verification

# Session for connection pooling
session = requests.Session()


def normalize_word(word):
    """Normalize special characters to Swedish equivalents"""
    normalized = ''
    for char in word:
        normalized += CHAR_NORMALIZATION.get(char, char)
    return normalized


def is_valid_word(word):
    """
    Check if a word should be stored based on filtering rules:
    1. Only contains Swedish letters (a-ö) OR special chars that normalize to Swedish
    2. Single-letter words only allowed if they are 'i', 'å', or 'ö'
    3. No colons, hyphens, or spaces allowed
    """
    if not word:
        return False

    # Reject words with colons, hyphens, or spaces
    if ':' in word or '-' in word or ' ' in word:
        return False

    word_lower = word.lower()

    # Normalize the word and check if normalized version is valid Swedish
    normalized = normalize_word(word_lower)

    # Check if normalized word contains only Swedish letters (a-z, å, ä, ö)
    if not re.match(r'^[a-zåäö]+$', normalized):
        return False

    # If single letter (after normalization), only allow 'i', 'å', or 'ö'
    if len(normalized) == 1 and normalized not in ['i', 'å', 'ö']:
        return False

    return True


def load_checkpoint():
    """Load previously processed URLs and word forms from checkpoint"""
    global processed_urls, all_word_forms, current_unik

    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, 'rb') as f:
                checkpoint_data = pickle.load(f)
                processed_urls = checkpoint_data.get('urls', set())
                all_word_forms = checkpoint_data.get('forms', set())
                current_unik = checkpoint_data.get('unik', '0')
            print(f"Resumed: {len(processed_urls)} URLs processed, {len(all_word_forms)} unique forms")
            if current_unik != '0':
                print(f"Resuming from pagination position: unik={current_unik}")
        except Exception as e:
            print(f"Could not load checkpoint: {e}")
            processed_urls = set()
            all_word_forms = set()
            current_unik = '0'

    # Load existing forms from output file if it exists
    if os.path.exists(output_file) and not all_word_forms:
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                all_word_forms = set(line.strip() for line in f if line.strip())
            print(f"Loaded {len(all_word_forms)} existing forms from output file")
        except Exception as e:
            print(f"Could not load output file: {e}")


def save_checkpoint():
    """Save progress to checkpoint file"""
    try:
        with open(checkpoint_file, 'wb') as f:
            pickle.dump({
                'urls': processed_urls,
                'forms': all_word_forms,
                'unik': current_unik
            }, f)
    except Exception as e:
        print(f"Error saving checkpoint: {e}")


def fetch_word_details(word_url, max_retries=3):
    """Fetch word detail page and extract all inflected forms"""

    # Skip if already processed
    if word_url in processed_urls:
        return []

    for attempt in range(max_retries):
        try:
            response = session.get(word_url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, features="html.parser")

            # Extract all word forms from <span class="bform"> elements
            # These contain the actual inflected forms
            bform_spans = soup.find_all("span", class_="bform")
            word_forms = [span.get_text().strip() for span in bform_spans if span.get_text().strip()]

            # Mark URL as processed
            processed_urls.add(word_url)

            return word_forms

        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
            else:
                print(f"Failed to fetch {word_url} after {max_retries} attempts: {e}")
                processed_urls.add(word_url)  # Mark as processed to avoid infinite retries
                return []

    return []


def process_word_batch(word_urls):
    """Process a batch of word URLs in parallel"""
    new_forms = set()

    # Use ThreadPoolExecutor for parallel requests
    with ThreadPoolExecutor(max_workers=15) as executor:
        # Submit all tasks
        future_to_url = {executor.submit(fetch_word_details, url): url for url in word_urls}

        # Collect results as they complete
        for future in as_completed(future_to_url):
            try:
                forms = future.result()
                for form in forms:
                    # Filter: only add valid words
                    if is_valid_word(form):
                        # Add original form
                        if form not in all_word_forms:
                            new_forms.add(form)
                            all_word_forms.add(form)

                        # Also add normalized version if different
                        normalized = normalize_word(form)
                        if normalized != form and normalized not in all_word_forms:
                            new_forms.add(normalized)
                            all_word_forms.add(normalized)
            except Exception as e:
                url = future_to_url[future]
                print(f"Error processing {url}: {e}")

    return new_forms


def write_forms_to_file(forms):
    """Append new word forms to output file"""
    if forms:
        try:
            with open(output_file, 'a', encoding='utf-8') as f:
                for form in sorted(forms):  # Sort for consistent output
                    f.write(form + '\n')
        except Exception as e:
            print(f"Error writing to file: {e}")


def find_complete_resume_point(start_unik_str, original_unik_str):
    """
    Scan forward from start_unik to find first URL with missing word forms.
    Ensures 100% data integrity by verifying all forms are stored.

    Returns: (verified_unik, checked_count, first_incomplete_url_or_None)
    """
    start_unik = int(start_unik_str)
    original_unik = int(original_unik_str)

    # Get processed URLs >= start_unik, sorted by ID
    urls_to_check = []
    for url in processed_urls:
        if 'id=' in url:
            try:
                url_id = int(url.split('id=')[1].split('&')[0])
                if url_id >= start_unik:
                    urls_to_check.append((url_id, url))
            except:
                continue

    urls_to_check.sort()  # Sort by ID
    urls_to_check = urls_to_check[:MAX_VERIFICATION_URLS]  # Limit to prevent too long verification

    if not urls_to_check:
        print("  No URLs to verify (starting from beginning)")
        return (start_unik_str, 0, None)

    print(f"\n🔍 Verifying data integrity...")
    print(f"  Checking {len(urls_to_check)} URLs starting from ID {start_unik}...")

    checked_count = 0
    for url_id, url in urls_to_check:
        checked_count += 1

        # Show progress every 50 URLs
        if checked_count % 50 == 0:
            print(f"  Checked {checked_count}/{len(urls_to_check)} URLs...")

        # Re-fetch and extract word forms for this URL
        try:
            response = session.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.text, features="html.parser")

            # Extract all word forms from <span class="bform"> elements
            bform_spans = soup.find_all("span", class_="bform")
            extracted_forms = [span.get_text().strip() for span in bform_spans if span.get_text().strip()]

            # Filter to valid forms only and collect both original + normalized
            valid_forms_to_check = []
            for form in extracted_forms:
                if is_valid_word(form):
                    valid_forms_to_check.append(form)
                    # Also check normalized version
                    normalized = normalize_word(form)
                    if normalized != form:
                        valid_forms_to_check.append(normalized)

            # Check if ALL valid forms exist in all_word_forms
            if valid_forms_to_check:  # Only check if there are valid forms
                missing_forms = [form for form in valid_forms_to_check if form not in all_word_forms]

                if missing_forms:
                    print(f"\n  ⚠️  Found incomplete data at URL ID {url_id}")
                    print(f"     URL: {url}")
                    print(f"     Missing forms: {missing_forms[:5]}{'...' if len(missing_forms) > 5 else ''}")
                    print(f"     ({len(missing_forms)}/{len(valid_forms_to_check)} forms missing)")
                    print(f"  ✓ Verified {checked_count - 1} URLs before this point\n")
                    return (str(url_id), checked_count - 1, url)

        except Exception as e:
            # On error, be conservative and resume from here
            print(f"\n  ⚠️  Error checking URL ID {url_id}: {e}")
            print(f"  ✓ Verified {checked_count - 1} URLs before this point\n")
            return (str(url_id), checked_count - 1, url)

    # All checked URLs are complete - resume from original checkpoint position
    # (The original unik points to the NEXT page to process, not an already-processed URL)
    print(f"  ✓ All {checked_count} URLs verified - data complete!")
    print(f"  Resuming from original checkpoint position\n")
    return (str(original_unik), checked_count, None)


def fetch_word_list_page(page_data, max_retries=5):
    """Fetch word list page with retry logic for resilience"""
    for attempt in range(max_retries):
        try:
            response = session.post(
                'https://svenska.se/wp-admin/admin-ajax.php',
                data=page_data,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            return response
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s, 6s, 8s, 10s
                print(f"⚠️  Page fetch failed (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"   Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"❌ Failed to fetch page after {max_retries} attempts")
                raise  # Re-raise the exception after all retries exhausted


def main():
    """Main function to scrape all Swedish words and their inflections"""
    global current_unik

    print("Starting Swedish word inflection extractor...")
    print(f"Output file: {output_file}")
    print(f"Checkpoint file: {checkpoint_file}")

    # Load checkpoint if exists
    load_checkpoint()

    # Apply safety buffer and verify data integrity on resume
    if current_unik != '0':
        buffer_unik = max(0, int(current_unik) - RESUME_SAFETY_BUFFER)
        print(f"\nApplying safety buffer: going back {RESUME_SAFETY_BUFFER} IDs (~10 pages)")
        print(f"  Original resume point: unik={current_unik}")
        print(f"  Safety buffer start: unik={buffer_unik}")

        # Verify data integrity from buffer point
        verified_unik, checked_count, incomplete_url = find_complete_resume_point(str(buffer_unik), current_unik)

        if incomplete_url:
            print(f"⚠️  Data verification found incomplete word at: {incomplete_url}")
            print(f"   {checked_count} words verified as complete before this")
            print(f"   Resuming from verified safe point: unik={verified_unik}")
        else:
            print(f"✅ Data integrity verified!")
            print(f"   All {checked_count} checked words have complete forms")
            print(f"   Resuming from verified point: unik={verified_unik}")

        current_unik = verified_unik

    # Initialize pagination from verified checkpoint
    data['unik'] = current_unik

    start_time = time.time()
    total_words_processed = 0
    batch_urls = []
    batch_size = 50  # Process 50 words at a time
    pages_checked = 0  # Track pages checked for skip progress
    last_successful_unik = current_unik  # Track last fully processed page

    try:
        for i in range(1, 20000):  # Iterate through pages
            # Fetch page with retry logic
            response = fetch_word_list_page(data)
            unik = parse_response(response, batch_urls)
            pages_checked += 1

            if unik == -1:
                print("Reached end of word list")
                break

            # Update pagination for next fetch (but don't save to checkpoint yet)
            data['unik'] = unik

            # Show skip progress every 100 pages if not processing
            if pages_checked % 100 == 0 and total_words_processed == 0:
                print(f"Checking pages... ({pages_checked} pages checked, unik={unik}, {len(batch_urls)} new URLs found)")

            # Process batch when it reaches batch_size
            if len(batch_urls) >= batch_size:
                # Show message when resuming after skip
                if total_words_processed == 0 and pages_checked > 1:
                    print(f"✓ Found new words after checking {pages_checked} pages. Resuming processing...")

                new_forms = process_word_batch(batch_urls)
                write_forms_to_file(new_forms)

                total_words_processed += len(batch_urls)
                batch_urls.clear()

                # NOW update checkpoint unik - AFTER successful processing
                current_unik = unik
                last_successful_unik = unik

                # Progress update
                elapsed = time.time() - start_time
                rate = total_words_processed / elapsed if elapsed > 0 else 0
                print(f"Processed: {total_words_processed} words | "
                      f"Unique forms: {len(all_word_forms)} | "
                      f"Rate: {rate:.1f} words/sec")

                # Save checkpoint every 500 words
                if total_words_processed % 500 == 0:
                    save_checkpoint()

        # Process remaining batch
        if batch_urls:
            new_forms = process_word_batch(batch_urls)
            write_forms_to_file(new_forms)
            total_words_processed += len(batch_urls)
            # Update checkpoint unik after final batch
            if 'unik' in locals():
                current_unik = unik

        # Final save
        save_checkpoint()

        elapsed = time.time() - start_time
        print(f"\n=== Completed ===")
        print(f"Total words processed: {total_words_processed}")
        print(f"Total unique word forms: {len(all_word_forms)}")
        print(f"Time elapsed: {elapsed/60:.1f} minutes")
        print(f"Output saved to: {output_file}")

    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Saving progress...")
        if batch_urls:
            new_forms = process_word_batch(batch_urls)
            write_forms_to_file(new_forms)
            # Update unik after processing batch on interrupt
            if 'unik' in locals():
                current_unik = unik
        save_checkpoint()
        print("Progress saved. Run again to resume.")
        print(f"Last successful page: unik={current_unik}")
    except Exception as e:
        print(f"Error in main loop: {e}")
        # Don't update current_unik on error - resume from last successful point
        save_checkpoint()
        print(f"Checkpoint saved. Resume from: unik={current_unik}")
        raise


def parse_response(response, batch_urls):
    """Parse the HTML response and collect word URLs"""
    soup = BeautifulSoup(response.text, features="html.parser")
    links = soup.findAll("a", class_='slank')

    if len(links) == 0:
        return -1

    # Collect URLs from all links (skip first one as per original logic)
    for link in links[1:]:
        word_url = link['href'].strip()
        if word_url not in processed_urls:
            batch_urls.append(word_url)

    # Get next page unik
    div = soup.findAll("div", class_='pilned')
    return div[0].a['unik']


if __name__ == '__main__':
    main()
