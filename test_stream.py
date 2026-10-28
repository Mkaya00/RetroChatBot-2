import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
import main


def packet(text):
    return 'data: ' + json.dumps({'candidates': [{'content': {'parts': [{'text': text}]}}]}) + '\n\n'


class StreamingTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def call(self, handler, era='1999'):
        original_client = httpx.AsyncClient
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-key', 'GEMINI_MODEL': 'primary',
                                     'GEMINI_FALLBACK_MODELS': 'backup'}), \
             patch('main.httpx.AsyncClient', side_effect=lambda **kw: original_client(
                 transport=httpx.MockTransport(handler), **kw)):
            result = self.client.post('/api/chat/stream', json={
                'era': era, 'messages': [{'role': 'user', 'text': 'How can I keep in touch?'}]
            })
        self.assertEqual(result.status_code, 200)
        return [json.loads(line) for line in result.text.splitlines() if line]

    def test_future_product_is_guarded_across_chunks(self):
        async def respond(request):
            self.assertIn('streamGenerateContent', request.url.path)
            self.assertEqual(request.url.params['alt'], 'sse')
            return httpx.Response(200, text=packet('Whats') + packet('App. ') + packet('ICQ works too.'))
        events = self.call(respond)
        text = ''.join(e.get('text', '') for e in events)
        self.assertNotIn('Use WhatsApp', text)
        self.assertIn('not heard of', text)
        self.assertEqual(events[-1]['type'], 'done')

    def test_modern_stream_is_marked_as_scenario(self):
        async def respond(request):
            self.assertEqual(json.loads(request.content)['systemInstruction']['parts'][0]['text'], main.MODERN_PROMPT)
            return httpx.Response(200, text=packet('It is 2030.'))
        events = self.call(respond, '2030')
        text = ''.join(e.get('text', '') for e in events)
        self.assertTrue(text.startswith('2030 scenario / speculation:'))

    def test_stream_falls_back_on_overload(self):
        attempts = []
        async def respond(request):
            attempts.append(request.url.path)
            if len(attempts) == 1:
                return httpx.Response(503)
            return httpx.Response(200, text=packet('Hello.'))
        events = self.call(respond)
        self.assertEqual(len(attempts), 2)
        self.assertTrue(events[0]['fallback'])
        self.assertEqual(events[-1]['type'], 'done')

    def test_all_models_fail_with_error_event(self):
        async def respond(request):
            return httpx.Response(429)
        events = self.call(respond)
        self.assertEqual(events[-1]['type'], 'error')
        self.assertIn('quota', events[-1]['message'])
        self.assertFalse(any(e['type'] == 'done' for e in events))

    def test_missing_key_and_invalid_history(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            result = self.client.post('/api/chat/stream', json={'messages': [{'role': 'user', 'text': 'Hello'}]})
            self.assertEqual(result.status_code, 503)
        result = self.client.post('/api/chat/stream', json={'messages': [{'role': 'model', 'text': 'Hello'}]})
        self.assertEqual(result.status_code, 422)

    def test_empty_provider_response_is_not_success(self):
        async def respond(request):
            return httpx.Response(200, text='data: {"candidates":[]}\n\n')
        events = self.call(respond)
        self.assertEqual(events[-1]['type'], 'error')
        events = self.call(respond, '2030')
        self.assertEqual(events[-1]['type'], 'error')

    def test_truncated_generation_is_not_saved_as_complete(self):
        async def respond(request):
            return httpx.Response(200, text=packet('A sentence. ') +
                'data: {"candidates":[{"finishReason":"MAX_TOKENS"}]}\n\n')
        events = self.call(respond)
        self.assertEqual(events[-1]['type'], 'error')
        self.assertFalse(any(e['type'] == 'done' for e in events))


if __name__ == '__main__':
    unittest.main()
