import {
  AuthenticationProvider,
  EventEmitter,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  Event,
  SecretStorage,
  window
} from 'vscode';

import { SailPointIIQAuthenticationSession } from './SailPointIIQAuthenticationSession';
import { SailPointIIQCredential } from './SailPointIIQCredential';

export class SailPointIIQAuthenticationProvider implements SailPointIIQAuthenticationProvider {
  public static id: string = "SailPointIIQAuthenticationProvider";
  private _sessions: SailPointIIQAuthenticationSession[] = [];
  private readonly _onDidChangeSessions = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
  public onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent> = this._onDidChangeSessions.event;
  constructor(private readonly secrets: SecretStorage) {
    this.init();
  }
  public async getSessions(scopes?: readonly string[]): Promise<readonly SailPointIIQAuthenticationSession[]> {
    const sessions = this._sessions.filter(session => scopes !== undefined ? session.scopes[0] === scopes[0] : true);
    return sessions;
  }
  public async createSession(scopes: readonly string[]): Promise<SailPointIIQAuthenticationSession> {
    const username = await window.showInputBox({
      title: `SailPoint IdentityIQ Login for ${scopes[0]}`,
      prompt: `Please provide the username.`,
      ignoreFocusOut: true
    });
    const accessToken = await window.showInputBox({
      title: `SailPoint IdentityIQ Login for ${username} [${scopes[0]}]`,
      prompt: `Please provide the password.`,
      ignoreFocusOut: true,
      password: true
    });
    if (!username || !accessToken) {
      return Promise.reject(`Authentication cancelled by end user.`);
    }
    const s = new SailPointIIQAuthenticationSession(username, accessToken, scopes);
    this._sessions.push(s);
    this._onDidChangeSessions.fire({ added: [s], removed: [], changed: [] });
    await this.saveSecrets();
    return s;
  }
  public async removeSession(sessionId: string): Promise<void> {
    const idx = this._sessions.findIndex(session => session.id === sessionId);
    const session = this._sessions[idx];
    this._sessions.splice(idx, 1);
    this._onDidChangeSessions.fire({ added: [], removed: [session], changed: [] });
    await this.saveSecrets();
  }
  private async init(): Promise<void> {
    const credentialJSON = await this.secrets.get(SailPointIIQAuthenticationProvider.id);
    if (credentialJSON) {
      const credentials: SailPointIIQCredential[] = JSON.parse(credentialJSON) as SailPointIIQCredential[];
      const added: SailPointIIQAuthenticationSession[] = [];
      credentials.map(credential => {
        const session = new SailPointIIQAuthenticationSession(credential.username, credential.password, [credential.environment]);
        added.push(session);
      });
      this._sessions.push(...added);
      this._onDidChangeSessions.fire({ added, removed: [], changed: []});
    }
  }
  private async saveSecrets() {
    const credentials: SailPointIIQCredential[] = [];
    this._sessions.forEach(session => {
      credentials.push({
        username: session.account.id,
        password: session.accessToken,
        environment: session.environment
      });
    });
    if (credentials.length > 0) {
      const credentialJSON = JSON.stringify(credentials);
      await this.secrets.store(SailPointIIQAuthenticationProvider.id, credentialJSON);
    } else {
      await this.secrets.delete(SailPointIIQAuthenticationProvider.id);
    }
  }
}