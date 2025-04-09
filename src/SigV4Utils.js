import crypto from 'crypto-js';

export function getSignedUrl({ host, region, credentials }) {
  const time = new Date();
  const dateStamp = time.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
  const amzdate = time.toISOString().replace(/[:-]|\.\d{3}/g, '') + 'Z';
  const service = 'iotdevicegateway';
  const algorithm = 'AWS4-HMAC-SHA256';
  const method = 'GET';
  const canonicalUri = '/mqtt';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQuerystring = [
    `X-Amz-Algorithm=${algorithm}`,
    `X-Amz-Credential=${encodeURIComponent(`${credentials.accessKeyId}/${credentialScope}`)}`,
    `X-Amz-Date=${amzdate}`,
    `X-Amz-SignedHeaders=host`,
    `X-Amz-Security-Token=${encodeURIComponent(credentials.sessionToken)}`
  ].join('&');

  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = crypto.SHA256('').toString();
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    'host',
    payloadHash
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzdate,
    credentialScope,
    crypto.SHA256(canonicalRequest).toString()
  ].join('\n');

  const kDate = crypto.HmacSHA256(dateStamp, 'AWS4' + credentials.secretAccessKey);
  const kRegion = crypto.HmacSHA256(region, kDate);
  const kService = crypto.HmacSHA256(service, kRegion);
  const kSigning = crypto.HmacSHA256('aws4_request', kService);
  const signature = crypto.HmacSHA256(stringToSign, kSigning).toString();

  const signedUrl = `wss://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  return signedUrl;
}
