# SAOL Swedish Word Scraper

Scrapes Swedish words from [svenska.se](https://svenska.se) and uploads to Supabase.

## Setup

```bash
# Install dependencies
pipenv install

# Configure Supabase
cp .env.example .env
# Edit .env with your SUPABASE_URL and SUPABASE_KEY
```

## Usage

```bash
# 1. Scrape words (~2-3 hours, resumable with Ctrl+C)
pipenv run python3 client.py

# 2. Upload to Supabase
 pipenv run python3 upload_to_supabase.py
```

## Output

- `dictionary_sv.txt` - ~700k+ Swedish word forms
- `checkpoint.pkl` - Resume checkpoint (can delete to start fresh)

## Features

- ✅ Handles special characters (ç, à, ê, ñ, ü, è, æ)
- ✅ Stores both original and normalized forms
- ✅ Filters out words with colons, hyphens, spaces
- ✅ Resumable scraping with checkpoints
- ✅ Batch upload with retry logic
