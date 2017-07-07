import { Component, OnInit,
         AfterViewInit,
         ElementRef,
         Renderer,
         ViewChild } from '@angular/core';
import { Router }    from '@angular/router';

// Services
import { ConfigService } from '../config.service';
import { DavisService } from '../../davis.service';
import * as _ from "lodash";
import * as Clipboard from 'clipboard';

@Component({
    selector: 'config-slack',
    templateUrl: './config-slack.component.html',
})
export class ConfigSlackComponent implements OnInit, AfterViewInit {
  
  @ViewChild('clientId') clientId: ElementRef;

  requestUri: string = '';
  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Skip and Finish' : 'Connect';
  isPasswordFocused: boolean = false;
  isPasswordMasked: boolean = true;
  isDirty: boolean = false;
  isSecretMasked: boolean = true;
  confirmDeleteSlackAppConfig: boolean = false;
  
  constructor(
    private renderer: Renderer,
    public iDavis: DavisService, 
    public iConfig: ConfigService, 
    public router: Router) {}

  validate() {
    if (this.iConfig.values.slack.clientId && this.iConfig.values.slack.clientSecret) {
        this.submitButton = 'Connect';
    } else if (!this.iConfig.status['slack'].success && this.iConfig.isWizard){
        this.submitButton = 'Skip and Finish';
    }
    this.isDirty = !_.isEqual(this.iConfig.values.slack, this.iConfig.values.original.slack);
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Skip and Finish' : 'Connect';
  }

  doSubmit() {
    this.submitted = true;
    this.iConfig.values.slack.clientId = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.slack.clientId, 'clientId');
    this.iConfig.values.slack.clientSecret = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.slack.clientSecret, 'clientSecret');
    if (!this.iConfig.status['slack'].success && this.iConfig.values.slack.clientId && this.iConfig.values.slack.clientSecret) {
      this.submitButton = 'Connecting...';
      this.iConfig.connectSlack()
        .then(response => {
          if (!response.success) { 
            this.resetSubmitButton(); 
            throw new Error(response.message); 
          }
          return this.iConfig.startSlack();
        })
        .then(response => {
          if (!response.success) throw new Error(response.message); 
          this.iConfig.status['slack'].success = true;
          this.iDavis.windowLocation(`https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot&client_id=${this.iConfig.values.slack.clientId}`);
        })
        .catch(err => {
          this.iConfig.displayError(err, 'slack');
        });
    } else if (this.iConfig.isWizard) {
      this.iConfig.isWizard = false;
      this.iDavis.isAdmin = true;
      this.iDavis.isAuthenticated = true;
      this.router.navigate(['/davis']);
    }
  }
  
  deleteSlackAppConfig() {
    if (this.confirmDeleteSlackAppConfig) {
      this.iConfig.removeSlackAppConfig()
        .then(response => {
          if (!response.success) throw new Error(response.message);
          
          this.iConfig.values.original.slack.clientId = null;
          this.iConfig.values.original.slack.clientSecret = null;
          
          this.isDirty = true;
          this.iConfig.status['slack'].success = null;
          this.confirmDeleteSlackAppConfig = false;
        })
        .catch(err => {
          this.iConfig.displayError(err, 'slack');
        });
    } else {
      this.confirmDeleteSlackAppConfig = true;
    }
  }

  ngOnInit() {
    this.iConfig.status['slack'].success = null;
    this.iDavis.isBreadcrumbsVisible = true;
    this.requestUri = `${window.location.protocol}//${window.location.host}/slack/receive`;
  }
  
  ngAfterViewInit() {
    if (this.iConfig.isWizard || !this.iConfig.values.slack.clientId || this.iConfig.values.slack.clientId.length < 1) {
      this.renderer.invokeElementMethod(this.clientId.nativeElement, 'focus');
      setTimeout(() => {
        this.validate();
      }, 300);
      setTimeout(() => {
        this.validate();
      }, 1000);
    }
    new Clipboard('.clipboard');
    
    if (!this.iConfig.isWizard) {
      this.iConfig.getSlack()
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
}
