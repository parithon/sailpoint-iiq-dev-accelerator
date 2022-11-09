import { URL } from 'url';
import fetch, { Headers } from 'node-fetch';
import * as base64 from 'base-64';
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { isStringObject } from 'util/types';
import { 
  window,
  ProgressLocation
} from 'vscode';

import { SailPointIIQCredential } from '../auth';

function getSanitizedUrl(url: string): URL {
  url = url.replace(/\/\//g, "/");
  return new URL(url);
}

async function get<T>(url: URL, credential: SailPointIIQCredential, body?: string | object): Promise<Response<T>> {
  return req<T>('GET', url, credential, body);
}

async function post<T>(url: URL, credential: SailPointIIQCredential, body?: string | object): Promise<Response<T>> {
  return req<T>('POST', url, credential, body);
}

async function req<T>(method: 'GET' | 'POST', url: URL, credential: SailPointIIQCredential, body?: string | object): Promise<Response<T>> {
  let response: Response<T> = { ok: false };

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', `Basic ${base64.encode(`${credential.username}:${credential.password}`)}`);

  const agent: HttpAgent | HttpsAgent = url.protocol === 'https'
    ? new HttpsAgent({ rejectUnauthorized: false })
    : new HttpAgent();

  const bodyValue = method === 'POST' 
    ? (isStringObject(body) 
      ? body.toString() 
      : JSON.stringify(body))
    : undefined;

  const options = {
    method,
    body: bodyValue,
    headers,
    agent,
    timeout: 10000000
  };

  try {
    const resp = await fetch(url.toString(), options);
    response.ok = resp.ok;
    if (resp.ok) {
      const json: any = await resp.json();
      if (json.errors) {
        response.fail = json.errors[0];
      } else {
        response.json = json as T;
      }
    } else {
      response.fail = resp.status;
    }
  }
  catch (error: any) {
    response.fail = error;
  }

  return response;
}

export interface Response<T> {
  ok: boolean;
  json?: T;
  fail?: any;
}

export interface JsonAuthenticationResult {
  identity: string;
  authentication: 'success' | 'authenticationFailure';
}

export async function VerifyAuthentication(credential: SailPointIIQCredential, baseUrl: string): Promise<[boolean, string | undefined]> {
  const requestUrl = getSanitizedUrl(`${baseUrl}/rest/authentication`);
  var resp = await window.withProgress({
    location: ProgressLocation.Notification,
    cancellable: true
  }, progress => {
    return get<JsonAuthenticationResult>(requestUrl, credential);
  });
  const isOK = resp.ok && resp.json?.authentication !== 'authenticationFailure';
  return [isOK, resp.json?.identity];
}
