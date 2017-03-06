export class CommonModel {
  user: any = {
    email: '',
    password: '',
    timezone: '',
    alexa_ids: [],
    name: {
      first: '',
      last: '',
    },
    admin: false,
    owner: '',
  };

  filter: any = {
    name: '',
    owner: '',
    description: '',
    enabled: true,
    scope: '',
    origin: '',
    status: [],
    impact: [],
    severityLevel: [],
    entityID: [],
    excludeEventType: [],
    tags: {
      includes: [],
      excludes: [],
    },
  };
  
  dynatrace: any = {
    url: '',
    apiUrl: '',
    token: '',
    strictSSL: true,
  };

  ymonitor: any = {
        url: '',
        apiUrl: '',
        token: '',
        username: '',
        password: '',
        strictSSL: true,
      };
  
  notifications: any = {
    uri: '',
    config: '',
  };
  
  slack: any = {
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  };

  status: any = {
    error: null,
    success: null
  };
}