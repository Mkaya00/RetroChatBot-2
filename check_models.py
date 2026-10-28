"""Check model access without printing the API key."""
import concurrent.futures
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

def check(model):
    try:
        response = httpx.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            headers={'x-goog-api-key': os.getenv('GEMINI_API_KEY', '')},
            json={'contents': [{'parts': [{'text': 'Say hello.'}]}]}, timeout=35,
        )
        return model, response.status_code, response.json().get('error', {}).get('status', 'OK')
    except httpx.HTTPError:
        return model, 0, 'Connection error'

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(check, ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']):
            print(*result)
