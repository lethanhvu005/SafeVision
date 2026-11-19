// Set SOS_SHARED_SECRET in Project Settings > Script properties, never in source.
function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run once in the editor to authorize MailApp. Does not send email.
function authorizeMail() {
  console.log('Remaining recipient quota: ' + MailApp.getRemainingDailyQuota());
}

function doGet() {
  return jsonResponse({ok: true, service: 'SafeVision mail relay'});
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SOS_SHARED_SECRET');
    if (!secret || secret.length < 32 || payload.secret !== secret) {
      return jsonResponse({ok: false, error: 'Unauthorized: shared secret mismatch'});
    }
    // Accept exactly one recipient; no CC/BCC or arbitrary mail headers.
    if (typeof payload.to !== 'string' || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(payload.to)) {
      return jsonResponse({ok: false, error: 'Invalid recipient'});
    }
    if (typeof payload.subject !== 'string' || payload.subject.length > 255 ||
        typeof payload.body !== 'string' || payload.body.length > 20000) {
      return jsonResponse({ok: false, error: 'Invalid message'});
    }
    const files = payload.attachments || [];
    if (!Array.isArray(files) || files.length > 3 ||
        files.some(file => typeof file.content !== 'string' || file.content.length > 4000000)) {
      return jsonResponse({ok: false, error: 'Attachments too large'});
    }
    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse({ok: false, error: 'Daily mail quota exhausted'});
    }
    const attachments = files.map(file => Utilities.newBlob(
      Utilities.base64Decode(file.content), file.mimeType || 'application/octet-stream', file.name || 'evidence.jpg',
    ));
    MailApp.sendEmail({to: payload.to, subject: payload.subject, body: payload.body,
      name: 'SafeVision SOS', attachments: attachments});
    return jsonResponse({ok: true});
  } catch (error) {
    // Never echo incoming payload, body, or secret in responses/logs.
    return jsonResponse({ok: false, error: 'Mail relay failed. Check script authorization and mail quota.'});
  }
}
