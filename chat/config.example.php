<?php
return [
    // Prefer environment variable OPENAI_API_KEY in production.
    'openai_api_key' => '',
    // Cost-sensitive model is enough for website Q&A. Override with env OPENAI_MODEL.
    'openai_model' => 'gpt-6-luna',
    // Set a strong password here only if you cannot use env SUPERFAB_CHAT_ADMIN_PASSWORD.
    'admin_password' => '',
    'fallback_message' => 'Thank you for your enquiry. Our team will get back to you shortly.',
];
