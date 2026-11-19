// ============================================================================
// SafeVision - Google Apps Script Mail Relay (Code.gs)
// ============================================================================
// HƯỚNG DẪN SỬ DỤNG NHANH:
// 1. Thay giá trị FALLBACK_SHARED_SECRET bên dưới bằng đúng chuỗi GOOGLE_SCRIPT_SECRET
//    mà bạn đã đặt trong mục Environment của service safevision-api trên Render
//    (ít nhất 32 ký tự).
// 2. Chọn hàm `authorizeMail` trên thanh công cụ và bấm Run (Chạy) 1 lần để cấp quyền gửi mail.
// 3. Bấm Deploy > Manage deployments > Edit (biểu tượng bút chì) > Version: New version > Deploy.
// ============================================================================

const FALLBACK_SHARED_SECRET = 'QXn6x4iR3vP9mK2sY8uD1cL7aN5tF0wHjE4bZ6qR9pT2mV8x';

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function getConfiguredSecret() {
  const propSecret = PropertiesService.getScriptProperties().getProperty('SOS_SHARED_SECRET');
  const activeSecret = (propSecret && propSecret.trim()) ? propSecret.trim() : FALLBACK_SHARED_SECRET.trim();
  return activeSecret;
}

// Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền MailApp và đồng bộ Secret.
function authorizeMail() {
  const secret = getConfiguredSecret();
  if (secret && secret.length >= 32) {
    PropertiesService.getScriptProperties().setProperty('SOS_SHARED_SECRET', secret);
  }
  console.log('Remaining recipient quota: ' + MailApp.getRemainingDailyQuota());
  console.log('Configured secret length: ' + (secret ? secret.length : 0));
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtmlBody(subject, plainBody) {
  const lines = String(plainBody || '').split(/\r?\n/).filter(function(line) {
    return line.trim().length > 0;
  });

  var rowsHtml = '';
  var mapsUrl = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var sepIndex = line.indexOf(':');
    if (sepIndex > 0) {
      var label = line.substring(0, sepIndex).trim();
      var value = line.substring(sepIndex + 1).trim();
      if (/^https?:\/\/maps\.google\.com/i.test(value)) {
        mapsUrl = value;
        rowsHtml += '<tr>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:36%;">' + escapeHtml(label) + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;"><a href="' + escapeHtml(value) + '" style="color:#dc2626;font-weight:600;text-decoration:none;">' + escapeHtml(value) + '</a></td>' +
          '</tr>';
      } else {
        rowsHtml += '<tr>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:36%;">' + escapeHtml(label) + '</td>' +
          '<td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">' + escapeHtml(value) + '</td>' +
          '</tr>';
      }
    } else {
      rowsHtml += '<tr>' +
        '<td colspan="2" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">' + escapeHtml(line) + '</td>' +
        '</tr>';
    }
  }

  var mapButtonHtml = mapsUrl
    ? '<div style="margin-top:20px;text-align:center;">' +
        '<a href="' + escapeHtml(mapsUrl) + '" target="_blank" style="display:inline-block;background:#dc2626;color:#ffffff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">📍 Mở vị trí trên Google Maps</a>' +
      '</div>'
    : '';

  return '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #fecaca;border-radius:12px;overflow:hidden;background:#ffffff;">' +
    '<div style="background:#dc2626;color:#ffffff;padding:16px 20px;">' +
      '<h2 style="margin:0;font-size:18px;">🚨 ' + escapeHtml(subject) + '</h2>' +
      '<p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Cảnh báo khẩn cấp tự động từ hệ thống SafeVision</p>' +
    '</div>' +
    '<div style="padding:20px;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px;">' + rowsHtml + '</table>' +
      mapButtonHtml +
    '</div>' +
  '</div>';
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'SafeVision mail relay',
    secretConfigured: getConfiguredSecret().length >= 32
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ok: false, error: 'Empty request payload'});
    }

    const payload = JSON.parse(e.postData.contents);
    const expectedSecret = getConfiguredSecret();
    const incomingSecret = typeof payload.secret === 'string' ? payload.secret.trim() : '';

    if (!expectedSecret || expectedSecret.length < 32 || incomingSecret !== expectedSecret) {
      return jsonResponse({
        ok: false,
        error: 'Unauthorized: shared secret mismatch (kiem tra GOOGLE_SCRIPT_SECRET tren Render va FALLBACK_SHARED_SECRET trong Code.gs)'
      });
    }

    if (typeof payload.to !== 'string' || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(payload.to.trim())) {
      return jsonResponse({ok: false, error: 'Invalid recipient'});
    }

    if (typeof payload.subject !== 'string' || payload.subject.length > 255 ||
        typeof payload.body !== 'string' || payload.body.length > 20000) {
      return jsonResponse({ok: false, error: 'Invalid message'});
    }

    const files = payload.attachments || [];
    if (!Array.isArray(files) || files.length > 3 ||
        files.some(function(file) { return typeof file.content !== 'string' || file.content.length > 4000000; })) {
      return jsonResponse({ok: false, error: 'Attachments too large'});
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse({ok: false, error: 'Daily mail quota exhausted'});
    }

    const attachments = files.map(function(file) {
      return Utilities.newBlob(
        Utilities.base64Decode(file.content),
        file.mimeType || 'application/octet-stream',
        file.name || 'evidence.jpg'
      );
    });

    MailApp.sendEmail({
      to: payload.to.trim(),
      subject: payload.subject,
      body: payload.body,
      htmlBody: buildHtmlBody(payload.subject, payload.body),
      name: 'SafeVision SOS',
      attachments: attachments
    });

    return jsonResponse({ok: true});
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: 'Mail relay failed: ' + (error && error.message ? error.message : 'Check script authorization and mail quota.')
    });
  }
}
