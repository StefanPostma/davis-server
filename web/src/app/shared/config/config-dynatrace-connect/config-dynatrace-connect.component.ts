import { Component, OnInit,
         AfterViewInit,
         ElementRef,
         Renderer,
         ViewChild }      from '@angular/core';

// Services
import { ConfigService }  from '../config.service';
import { DavisService }   from '../../davis.service';
import * as _ from "lodash";

@Component({
  selector: 'config-dynatrace-connect',
  templateUrl: './config-dynatrace-connect.component.html',
})
export class ConfigDynatraceConnectComponent implements OnInit, AfterViewInit {

  @ViewChild('url') url: ElementRef;
  
  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  isTokenMasked: boolean = true;
  isDirty: boolean = false;
  isAdvancedExpanded: boolean = false;
  isSSL: boolean = false;

  constructor(
    private renderer: Renderer,
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    this.submitButton = 'Saving...';
    this.iConfig.values.dynatrace.url = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.dynatrace.url, 'url');
    this.iConfig.values.dynatrace.token = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.dynatrace.token, 'token');
    if (this.iConfig.values.dynatrace.url.slice(-1) === '/') {
      this.iConfig.values.dynatrace.url = this.iConfig.values.dynatrace.url.substring(0, this.iConfig.values.dynatrace.url.length - 1);
    }
    this.iConfig.connectDynatrace()
      .then(response => {
        if (!response.success) {
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        return this.iConfig.validateDynatrace();
      })
      .then(response => {
        if (!response.success) { 
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        
        this.iConfig.status['dynatrace-connect'].success = true;
        if (this.iConfig.isWizard) {
          this.iConfig.selectView('user');
        } else {
          this.iConfig.values.original.dynatrace = _.cloneDeep(this.iConfig.values.dynatrace);
          this.resetSubmitButton();
          this.validate();
        }
      })
      .catch(err => {
        this.iConfig.displayError(err, 'dynatrace-connect');
      });
  }

  validate() {
    this.isDirty = !_.isEqual(this.iConfig.values.dynatrace, this.iConfig.values.original.dynatrace);
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  }

  ngOnInit() {
    if (this.iConfig.isWizard) sessionStorage.removeItem('conversation');
  }
  
  ngAfterViewInit() {
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.01') {
      this.iConfig.status['dynatrace-connect'].error = 'Warning, please note that a valid SSL certificate is required to use davis!';
      this.iConfig.status['dynatrace-connect'].success = false;
    } else {
      this.isSSL = true;
    }
    
    if (this.iConfig.isWizard) {
      this.renderer.invokeElementMethod(this.url.nativeElement, 'focus');
      setTimeout(() => {
        this.validate();
      }, 300);
      setTimeout(() => {
        this.validate();
      }, 1000);
    }

    if (!this.iConfig.isWizard) {
      this.iConfig.getDynatrace()
        .then(response => {
          if (!response.success) throw new Error(response.message);
          this.iConfig.values.dynatrace = response.dynatrace;
          this.iConfig.values.original.dynatrace = _.cloneDeep(this.iConfig.values.dynatrace);
          this.validate();
        })
        .catch(err => {
          this.iConfig.displayError(err, null);
        });
    }
  }
}
