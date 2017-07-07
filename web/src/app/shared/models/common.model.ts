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
    demo: true,
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
    entity: [],
    entityTags: [],
    excludeEventType: [],
    tags: {
      includes: [],
      excludes: [],
    },
  };
  
  entity: any = {
    _id: '',
    name: '',
    category: '',
    entityId: '',
    display: {
      audible: '',
      visual: '',
    },
    aliases: [],
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