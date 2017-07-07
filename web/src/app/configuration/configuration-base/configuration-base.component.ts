// ============================================================================
// Config Base - Component
//
// This component creates Configuration landing page
// ============================================================================

// ----------------------------------------------------------------------------
// Imports
// ----------------------------------------------------------------------------
// Angular
import { Component, OnInit, Pipe, PipeTransform }   from '@angular/core';
import { Location }                                 from '@angular/common';
import { Router, ActivatedRoute }                   from '@angular/router';
import { Observable }                               from 'rxjs/Observable';
import { ConfigService }                            from '../../shared/config/config.service';
import { DavisService }                             from '../../shared/davis.service';
import * as _                                       from "lodash";

// ----------------------------------------------------------------------------
// Class
// ----------------------------------------------------------------------------
@Component({
  selector:    'configuration-base',
  providers: [Location],
  templateUrl: './configuration-base.component.html',
})

export class ConfigurationBaseComponent implements OnInit {
  sidebarItems: any = {
    user: {
      key:  'user',
      name: 'My Account',
      admin: false,
    },
    users: {
      key: 'users',
      name: 'User Accounts',
      admin: true,
    },
    filters: {
      key: 'filters',
      name: 'Filters',
      admin: false,
    },
    notifications: {
      key: 'notifications',
      name: 'Notifications',
      prefix: 'notification-',
      default: 'notification-rules',
      admin: false,
      expanded: null,
      items: {
        'notification-rules': {
          key: 'notification-rules',
          name: 'Rules',
          admin: false,
        },
        'notification-source': {
          key: 'notification-source',
          name: 'Connect to Source',
          admin: true,
        },
      }
    },
    dynatrace: {
      key: 'dynatrace',
      name: 'Dynatrace',
      prefix: 'dynatrace-',
      default: 'dynatrace-applications',
      admin: true,
      expanded: null,
      items: {
        'dynatrace-applications': {
          key: 'dynatrace-applications',
          name: 'Applications',
          admin: false,
        },
        'dynatrace-services': {
          key: 'dynatrace-services',
          name: 'Services',
          admin: false,
        },
        'dynatrace-connect': {
          key: 'dynatrace-connect',
          name: 'Connect to Tenant',
          admin: true,
        },
      }
    },
    ymonitor: {
        key: 'ymonitor',
        name: 'Ymonitor',
        admin: true,
      },
    slack: {
      key: 'slack',
      name: 'Slack App',
      admin: true,
    },
    chrome: {
      key: 'chrome',
      name: 'Voice Navigation',
      admin: false,
    },
  };
  
  expandedSection: string = '';

  // ------------------------------------------------------
  // Inject services
  // ------------------------------------------------------
  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public location: Location,
    public iConfig: ConfigService,
    public iDavis: DavisService
  ) { }
  
  isExpanded(item: any): boolean {
    return this.expandedSection === item.key 
      || ((this.iConfig.view === item.key || this.iConfig.view.indexOf(item.prefix) > -1)
        && this.expandedSection === '' && item.expanded !== false);
  }
  
  expandSection(item: any) {
    for (var sidebarItem in this.sidebarItems) {
      if (this.sidebarItems[sidebarItem].expanded && item.key !== this.expandedSection) {
        this.sidebarItems[sidebarItem].expanded = false;
      }
    }
    item.expanded = (item.expanded === null && this.iConfig.view.indexOf(item.prefix) > -1) ? false : !item.expanded; 
    (item.expanded && this.iConfig.view.indexOf(item.prefix) < 0) ? this.iConfig.selectView(item.default) : null;
    this.expandedSection = (item.expanded) ? item.key : '';
  }

  // ------------------------------------------------------
  // Initialize component
  // ------------------------------------------------------
  ngOnInit() {
    this.iDavis.isBreadcrumbsVisible = true;

    this.route
      .fragment
      .map(fragment => fragment || '')
      .subscribe(value => {
        
        // Check if section is nested inside expandable and user has permission
        let isVisible = false;
        if (!this.iDavis.isAdmin) {
          if (!this.sidebarItems[value]) {
            for (let key in this.sidebarItems) {
              if (this.sidebarItems[key].prefix 
                && value.indexOf(this.sidebarItems[key].prefix) > -1
                && !this.sidebarItems[key].items[value].admin) {
                isVisible = true;
              }
            } 
          } else if (!this.sidebarItems[value].admin) {
            isVisible = true;
          }
        } else if (value.length > 0) {
          isVisible = true;
        }
        
        if (isVisible && value !== 'configuration') {
          this.iConfig.selectView(value);
        } else {
          this.iConfig.selectView('user');
        }
      });
    
    this.iConfig.status['user'].success = null;
    this.iConfig.status['user'].error = null;
    this.iConfig.status['dynatrace-entities'].success = null;
    this.iConfig.status['dynatrace-entities'].error = null;
    this.iConfig.status['filter'].success = null;
    this.iConfig.status['filter'].error = null;
    this.iConfig.status['filters'].success = null;
    this.iConfig.status['filters'].error = null;
    this.iConfig.status['slack'].success = null;
    this.iConfig.status['slack'].error = null;
    this.iConfig.status['ymonitor'].success = null;
    this.iConfig.status['ymonitor'].error = null;
  
    this.iConfig.helpLinkText = 'Help for these settings';  
  
    this.iDavis.getDavisUser()
      .then(response => {
        if (!response.success) throw new Error(response.message); 
        this.iDavis.values.user = response.user;
        if (this.iDavis.values.user.alexa_ids && this.iDavis.values.user.alexa_ids.length > 0) {
          this.iDavis.values.user.alexa_id = this.iDavis.values.user.alexa_ids[0];
        } else {
          this.iDavis.values.user.alexa_id = '';
        }
        this.iDavis.values.user.password = '';

        // Backwards compatibility, was once optional
        if (!response.user.name) {
          this.iDavis.values.user.name = { first: '', last: '' };
        } else {
          if (!response.user.name.first) this.iDavis.values.user.name.first = '';
          if (!response.user.name.last) this.iDavis.values.user.name.last = '';
        }
        this.iConfig.values.original.user = _.cloneDeep(this.iDavis.values.user);
        return this.iDavis.getDavisVersion();
      })
      .then(response => {
        if (!response.success) { 
          throw new Error(response.message); 
        }
        this.iDavis.davisVersion = response.version;
        return this.iConfig.getDavisFilters();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.filters = response.filters;
        this.iConfig.values.filter.owner = this.iDavis.values.user._id;
        if (this.iDavis.isAdmin) { 
          return this.iConfig.getSlackChannels();
        } else {
          throw new Error('skip-admin-only');
        }
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.channels = response.channels;
        return this.iConfig.getDavisNotificationsEndpoint();
      })
      .then(response => {
        this.iConfig.values.notifications.uri = response.uri;
        this.iConfig.values.notifications.config = response.config;
         return this.iConfig.getDynatraceApplications();
      })
      .then(response => {
        this.iConfig.values.applications = response.applications;
        return this.iConfig.getDynatraceServices();
      })
      .then(response => {
        this.iConfig.values.services = response.services;
        return this.iConfig.getDynatraceAliases();
      })
      .then(response => {
        this.iConfig.values.aliases = response;
        return this.iConfig.getDynatrace();
      })
      
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.dynatrace = response.dynatrace;
        this.iConfig.values.original.dynatrace = _.cloneDeep(this.iConfig.values.dynatrace);
        return this.iConfig.getYmonitor();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.ymonitor = response.ymonitor;
        this.iConfig.values.original.ymonitor = _.cloneDeep(this.iConfig.values.ymonitor);
        return this.iConfig.getSlack();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.slack = response.slack;
        this.iConfig.values.slack.enabled = true;
        if (this.iConfig.values.slack.redirectUri.length < 1) {
          this.iConfig.values.slack.redirectUri = `${window.location.protocol}//${window.location.host}/oauth`;
        }
        this.iConfig.values.original.slack = _.cloneDeep(this.iConfig.values.slack);
      })
      .catch(err => {
        this.iConfig.displayError(err, null);
      });
  }
}
