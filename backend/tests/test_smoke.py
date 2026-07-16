from django.test import TestCase, Client


class SmokeTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_root_redirects_to_api(self):
        """Root URL should redirect into the API namespace."""
        resp = self.client.get('/', follow=False)
        self.assertIn(resp.status_code, (301, 302))
        location = resp.get('Location', '')
        self.assertIn('/api', location)
