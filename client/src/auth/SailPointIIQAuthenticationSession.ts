import { randomUUID } from 'crypto';
import { 
  AuthenticationSession,
  AuthenticationProviderInformation
} from 'vscode'

export class SailPointIIQAuthenticationSession implements AuthenticationSession {
  readonly accessToken: string;
  readonly account: AuthenticationProviderInformation;
  readonly id: string = randomUUID();
  readonly scopes: string[] = [];
  get environment(): string {
    return this.scopes[0];
  }
  constructor(username: string, password: string, scopes: readonly string[]) {
    this.scopes.push(...scopes);
    this.accessToken = password;
    this.account = {
      id: username,
      label: `${username} [${this.environment}]`
    };
  }
}