// ============================================================================
// Wizard Base - COMPONENT
//
// This component creates the Wizard landing page
// ============================================================================

// ----------------------------------------------------------------------------
// Imports
// ----------------------------------------------------------------------------
// Angular
import { Component, OnInit }                from "@angular/core";

// Services
import { ConfigService }                    from "../../shared/config/config.service";
import { DavisService }                     from "../../shared/davis.service";
import * as _                               from "lodash";

// ----------------------------------------------------------------------------
// Class
// ----------------------------------------------------------------------------
@Component({
  selector:    "wizard-base",
  templateUrl: "./wizard-base.component.html",
})

export class WizardBaseComponent implements OnInit {
  // ------------------------------------------------------
  // Inject services
  // ------------------------------------------------------
  constructor(public iConfig: ConfigService, public iDavis: DavisService) {}

  ngOnInit() {
    this.iDavis.isBreadcrumbsVisible = true;
    this.iConfig.getDavisConfiguration()
      .then(response => {
        if (!response.success) { 
          throw new Error(response.message); 
        }
        this.iConfig.values.dynatrace.url = response.config.dynatrace.url;
        this.iConfig.values.dynatrace.token = response.config.dynatrace.token;
        this.iConfig.values.ymonitor.url = response.config.ymonitor.url;
        this.iConfig.values.ymonitor.token = response.config.ymonitor.token;
        this.iConfig.values.slack.clientId = response.config.slack.clientId;
        this.iConfig.values.slack.clientSecret = response.config.slack.clientSecret;
        this.iConfig.values.slack.redirectUri = response.config.slack.redirectUri;
        if (this.iConfig.values.slack.redirectUri.length < 1) {
          this.iConfig.values.slack.redirectUri = `${window.location.protocol}//${window.location.host}/oauth`;
        }
      })
      .catch(err => {
        this.iConfig.displayError(err, 'dynatrace-connect');
      });
  }
}
