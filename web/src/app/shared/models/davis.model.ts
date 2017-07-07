import { CommonModel } from './common.model';

export class DavisModel {

  davis: any = {
    values: {
      authenticate: {
        email: '',
        password: '',
      },
      user: new CommonModel().user,
    }
  };

  config: any = {
    values: {
      otherUser: new CommonModel().user,
      users: [],
      filter: new CommonModel().filter,
      entity: new CommonModel().entity,
      applications: [],
      services: [],
      entities: [],
      dynatrace: new CommonModel().dynatrace,
      notifications: new CommonModel().notifications,
      slack: new CommonModel().slack,
      channels: [],
      original: {
        user: new CommonModel().user,
        otherUser: new CommonModel().user,
        filter: new CommonModel().filter,
        entity: new CommonModel().entity,
        dynatrace: new CommonModel().dynatrace,
        slack: new CommonModel().slack,
      },
    },
    status: {
      'user': new CommonModel().status,
      'users': new CommonModel().status,
      'filter': new CommonModel().status,
      'filters': new CommonModel().status,
      'dynatrace-entities': new CommonModel().status,
      'dynatrace-connect': new CommonModel().status,
      'alexa': new CommonModel().status,
      'slack': new CommonModel().status,
    },
  };
  
  filterScope: any = {
    source: 'global',
    team_id: null,
    channel_id: null,
    email: null,
  };
  
  filterScopes: any = {
    sources: [
      {
        text: 'All',
        value: 'global',
      }, 
      {
        text: 'Web',
        value: 'web',
      }, 
      {
        text: 'Slack',
        value: 'slack',
      },
    ],
    teams: {},
    teams_array: [],
    channels: [],
    users: [],
  };
  
  filterOptions: any = {
    status: [
      {
        text: 'Open',
        value: 'OPEN',
        enabled: false,
      }, 
      {
        text: 'Closed',
        value: 'CLOSED',
        enabled: false,
      },
    ],
    impact: [
      {
        text: 'Application',
        value: 'APPLICATION',
        enabled: false,
      }, 
      {
        text: 'Service',
        value: 'SERVICE',
        enabled: false,
      },
      {
        text: 'Infrastructure',
        value: 'INFRASTRUCTURE',
        enabled: false,
      },
    ],
    severityLevel: [
      {
        text: 'Availability',
        value: 'AVAILABILITY',
        enabled: false,
      }, 
      {
        text: 'Error',
        value: 'ERROR',
        enabled: false,
      },
      {
        text: 'Performance',
        value: 'PERFORMANCE',
        enabled: false,
      },
      {
        text: 'Resource Contention',
        value: 'RESOURCE_CONTENTION',
        enabled: false,
      },
      {
        text: 'Custom Alert',
        value: 'CUSTOM_ALERT',
        enabled: false,
      },
    ],
    origin: [
      {
        text: 'All',
        value: 'ALL',
      }, 
      {
        text: 'Notification',
        value: 'NOTIFICATION',
      }, 
      {
        text: 'Question',
        value: 'QUESTION',
      },
    ],
  };
}
