const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function relay(overrides = {}) {
  const sent = [];
  const context = vm.createContext({
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: text => ({setMimeType: () => JSON.parse(text)})},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => 'x'.repeat(48)})},
    Utilities: {base64Decode: value => Buffer.from(value, 'base64'), newBlob: (data, mime, name) => ({data, mime, name})},
    MailApp: {getRemainingDailyQuota: () => 10, sendEmail: value => sent.push(value), ...overrides},
  });
  vm.runInContext(source, context);
  return {sent, post: payload => context.doPost({postData: {contents: JSON.stringify(payload)}})};
}
const payload = {secret: 'x'.repeat(48), to: 'test@example.com', subject: 'SOS test', body: 'Test only',
  attachments: [{name: 'evidence.jpg', mimeType: 'image/jpeg', content: 'YWJj'}]};
test('rejects invalid secret before sending', () => {
  const r = relay(); assert.equal(r.post({...payload, secret: 'bad'}).ok, false); assert.equal(r.sent.length, 0);
});
test('passes recipient and evidence to mail transport', () => {
  const r = relay(); assert.equal(r.post(payload).ok, true); assert.equal(r.sent.length, 1);
  assert.equal(r.sent[0].to, payload.to); assert.equal(r.sent[0].attachments[0].data.toString(), 'abc');
});
test('quota and transport failures are not reported as sent', () => {
  assert.equal(relay({getRemainingDailyQuota: () => 0}).post(payload).ok, false);
  assert.equal(relay({sendEmail: () => {throw Error('failed');}}).post(payload).ok, false);
});
test('rejects multiple recipients', () => {
  const r = relay(); assert.equal(r.post({...payload, to: 'a@example.com,b@example.com'}).ok, false);
  assert.equal(r.sent.length, 0);
});
