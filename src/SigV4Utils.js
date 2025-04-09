import crypto from 'crypto-js';

export function getSignedUrl({ accessKeyId, secretAccessKey, sessionToken, region, host }) {
  const service = 'iotdevicegateway';
  const protocol = 'wss';
  const canonicalUri = '/mqtt';
  const method = 'GET';
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzdate.substring(0, 8);
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQuerystring = `X-Amz-Algorithm=${algorithm}&X-Amz-Credential=${encodeURIComponent(
    `${accessKeyId}/${credentialScope}`
  )}&X-Amz-Date=${amzdate}&X-Amz-SignedHeaders=host`;

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = crypto.SHA256('').toString(crypto.enc.Hex);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzdate,
    credentialScope,
    crypto.SHA256(canonicalRequest).toString(crypto.enc.Hex)
  ].join('\n');

  function sign(key, msg) {
    return crypto.HmacSHA256(msg, key);
  }

  const kDate = sign(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  const kSigning = sign(kService, 'aws4_request');
  const signature = sign(kSigning, stringToSign).toString(crypto.enc.Hex);

  const finalQueryString =
    `${canonicalQuerystring}&X-Amz-Signature=${signature}` +
    (sessionToken ? `&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}` : '');

  return `${protocol}://${host}${canonicalUri}?${finalQueryString}`;
}
