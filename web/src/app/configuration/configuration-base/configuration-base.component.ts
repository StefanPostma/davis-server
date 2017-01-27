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
      expanded: false,
    },
    users: {
      key: 'users',
      name: 'User Accounts',
      admin: true,
      expanded: false,
    },
    filters: {
      key: 'filters',
      name: 'Filters',
      admin: false,
      expanded: false,
    },
    notifications: {
      key: 'notifications',
      name: 'Notifications',
      admin: false,
      expanded: false,
      items: {
        filters: {
          key: 'notifications',
          name: 'Filters',
          admin: false,
        }
      }
    },
    dynatrace: {
      key: 'dynatrace',
      name: 'Dynatrace',
      admin: true,
      expanded: false,
    },
    slack: {
      key: 'slack',
      name: 'Slack App',
      admin: true,
      expanded: false,
    },
    chrome: {
      key: 'chrome',
      name: 'Chrome Extension',
      admin: false,
      expanded: false,
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

  // ------------------------------------------------------
  // Initialize component
  // ------------------------------------------------------
  ngOnInit() {
    this.iDavis.isBreadcrumbsVisible = true;

    this.route
      .fragment
      .map(fragment => fragment || 'None')
      .subscribe(value => {
        if (this.sidebarItems[value]) {
          this.iConfig.selectView(value);
        } else {
          this.iConfig.selectView('user');
        }
      });
    
    this.iConfig.status['user'].success = null;
    this.iConfig.status['user'].error = null;
    this.iConfig.status['filter'].success = null;
    this.iConfig.status['filter'].error = null;
    this.iConfig.status['filters'].success = null;
    this.iConfig.status['filters'].error = null;
    this.iConfig.status['dynatrace'].success = null;
    this.iConfig.status['dynatrace'].error = null;
    this.iConfig.status['slack'].success = null;
    this.iConfig.status['slack'].error = null;
  
    this.iConfig.helpLinkText = 'Help for these settings';  
  
    this.iDavis.getDavisUser()
      .then(response => {
        if (!response.success) throw new Error(response.message); 
        this.iDavis.values.user = response.user;

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
        return this.iConfig.getDynatrace();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.dynatrace = response.dynatrace;
        this.iConfig.values.original.dynatrace = _.cloneDeep(this.iConfig.values.dynatrace);
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
