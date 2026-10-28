"""Core checks that require no API key or paid calls."""
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
import main


class AppTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_page_and_assets(self):
        self.assertEqual(self.client.get('/').status_code, 200)
        self.assertEqual(self.client.get('/static/app.js').status_code, 200)

    def test_missing_key(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            self.assertEqual(self.client.post('/api/chat', json={
                'messages': [{'role': 'user', 'text': 'Hello'}]
            }).status_code, 503)

    def test_invalid_history(self):
        for messages in ([], [{'role': 'user', 'text': '   '}],
                         [{'role': 'model', 'text': 'Hello'}]):
            self.assertEqual(self.client.post('/api/chat', json={'messages': messages}).status_code, 422)

    def test_gemini_payload_and_answer(self):
        original_client = httpx.AsyncClient
        async def respond(request):
            import json
            payload = json.loads(request.content)
            self.assertIn('1999', payload['systemInstruction']['parts'][0]['text'])
            self.assertEqual(request.headers['x-goog-api-key'], 'test-key')
            self.assertEqual(payload['contents'][0]['role'], 'user')
            return httpx.Response(200, json={'candidates': [{'content': {
                'parts': [{'text': 'Hello! It is 1999.'}]
            }}]})
        def mock_client(**kwargs):
            return original_client(transport=httpx.MockTransport(respond), **kwargs)
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch('main.httpx.AsyncClient', side_effect=mock_client):
            response = self.client.post('/api/chat', json={
                'messages': [{'role': 'user', 'text': 'What year is it?'}]
            })
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['reply'], 'Hello! It is 1999.')

    def test_temporary_overload_is_retried(self):
        original_client = httpx.AsyncClient
        attempts = []
        async def respond(request):
            attempts.append(request)
            if len(attempts) < 2:
                return httpx.Response(503, json={'error': {'status': 'UNAVAILABLE'}})
            return httpx.Response(200, json={'candidates': [{'content': {
                'parts': [{'text': 'Hello!'}]
            }}]})
        def mock_client(**kwargs):
            return original_client(transport=httpx.MockTransport(respond), **kwargs)
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch('main.httpx.AsyncClient', side_effect=mock_client):
            response = self.client.post('/api/chat', json={
                'messages': [{'role': 'user', 'text': 'Hello'}]
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(attempts), 2)
        self.assertNotEqual(attempts[0].url.path, attempts[1].url.path)
        self.assertTrue(response.json()['fallback'])

    def test_invalid_key_is_not_retried(self):
        original_client = httpx.AsyncClient
        attempts = []
        async def respond(request):
            attempts.append(request)
            return httpx.Response(403, json={'error': {'status': 'PERMISSION_DENIED'}})
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch('main.httpx.AsyncClient', side_effect=lambda **kw: original_client(
                 transport=httpx.MockTransport(respond), **kw)):
            response = self.client.post('/api/chat', json={
                'messages': [{'role': 'user', 'text': 'Hello'}]
            })
        self.assertEqual(response.status_code, 502)
        self.assertEqual(len(attempts), 1)

    def test_modern_era_uses_2030_prompt(self):
        original_client = httpx.AsyncClient
        async def respond(request):
            import json
            prompt = json.loads(request.content)['systemInstruction']['parts'][0]['text']
            self.assertEqual(prompt, main.MODERN_PROMPT)
            return httpx.Response(200, json={'candidates': [{'content': {
                'parts': [{'text': 'Welcome to 2030!'}]
            }}]})
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key'}), \
             patch('main.httpx.AsyncClient', side_effect=lambda **kw: original_client(
                 transport=httpx.MockTransport(respond), **kw)):
            response = self.client.post('/api/chat', json={
                'era': '2030', 'messages': [{'role': 'user', 'text': 'What year is it?'}]
            })
        self.assertEqual(response.status_code, 200)

    def test_unknown_era_is_rejected(self):
        response = self.client.post('/api/chat', json={
            'era': '2050', 'messages': [{'role': 'user', 'text': 'Hello'}]
        })
        self.assertEqual(response.status_code, 422)


if __name__ == '__main__':
    unittest.main()
