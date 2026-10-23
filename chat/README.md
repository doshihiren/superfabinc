# Superfab Website Chat Pilot

Lightweight PHP chatbot for the static Superfab website.

## Storage
- Uses SQLite when PDO SQLite is available.
- Falls back to a locked JSON file when SQLite is unavailable.
- Runtime data is stored under chat/data/ and is ignored by Git.

## Server setup
1. Copy chat/config.example.php to chat/config.local.php.
2. Prefer environment variables:
   - OPENAI_API_KEY
   - OPENAI_MODEL (optional, defaults to gpt-6-luna)
   - SUPERFAB_CHAT_ADMIN_PASSWORD
3. Ensure PHP can write to chat/data/.
4. Open /chat/admin.php to review conversations.

The pilot widget is loaded only on cable-tray-manufacturer-in-india.html.
