"""HTTPS transport for the Google Apps Script mail relay."""
import base64
import json
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def send_google_mail(settings, message) -> None:
    parsed = urlparse(settings.google_script_url)
    if parsed.scheme != 'https' or parsed.hostname != 'script.google.com' or not parsed.path.endswith('/exec'):
        raise ValueError('GOOGLE_SCRIPT_URL phải là URL triển khai https://script.google.com/.../exec')
    if len(settings.google_script_secret) < 32:
        raise ValueError('GOOGLE_SCRIPT_SECRET phải có ít nhất 32 ký tự')
    payload = {
        'secret': settings.google_script_secret,
        'to': str(message['To']), 'subject': str(message['Subject']),
        'body': message.get_body(preferencelist=('plain',)).get_content(),
        'attachments': [
            {'name': part.get_filename(), 'mimeType': part.get_content_type(),
             'content': base64.b64encode(part.get_payload(decode=True)).decode('ascii')}
            for part in message.iter_attachments()
        ],
    }
    request = Request(settings.google_script_url, data=json.dumps(payload).encode('utf-8'),
                      headers={'Content-Type': 'application/json'}, method='POST')
    try:
        # urllib follows Google's ContentService redirect to googleusercontent.com.
        with urlopen(request, timeout=25) as response:
            result = json.loads(response.read().decode('utf-8'))
    except Exception:
        raise RuntimeError('Không nhận được xác nhận từ Google Apps Script. Kiểm tra deployment/quyền truy cập; kiểm tra hộp thư trước khi gửi lại.') from None
    if not isinstance(result, dict) or result.get('ok') is not True:
        reason = result.get('error', 'Unknown response') if isinstance(result, dict) else 'Invalid response'
        raise RuntimeError(f'Google Apps Script: {str(reason)[:300]}')
