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
  selector: 'config-ymonitor',
  templateUrl: './config-ymonitor.component.html',
})
export class ConfigYmonitorComponent implements OnInit, AfterViewInit {

  @ViewChild('url') url: ElementRef;
  
  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  isTokenMasked: boolean = true;
  isDirty: boolean = false;
  isAdvancedExpanded: boolean = false;

  constructor(
    private renderer: Renderer,
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    this.submitButton = 'Saving...';
    this.iConfig.values.ymonitor.url = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.ymonitor.url, 'url');
    this.iConfig.values.ymonitor.token = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.ymonitor.token, 'token');
    if (this.iConfig.values.ymonitor.url.slice(-1) === '/') {
      this.iConfig.values.ymonitor.url = this.iConfig.values.ymonitor.url.substring(0, this.iConfig.values.ymonitor.url.length - 1);
    }
    this.iConfig.connectYmonitor()
      .then(response => {
        if (!response.success) { 
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        return this.iConfig.validateYmonitor();
      })
      .then(response => {
        if (!response.success) { 
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        
        this.iConfig.status['ymonitor'].success = true;
        if (this.iConfig.isWizard) {
          this.iConfig.selectView('user');
        } else {
          this.resetSubmitButton();
        }
      })
      .catch(err => {
        this.iConfig.displayError(err, 'ymonitor');
      });
  }

  validate() {
    this.isDirty = !_.isEqual(this.iConfig.values.ymonitor, this.iConfig.values.original.ymonitor);
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  }

  ngOnInit() {}
  
  ngAfterViewInit() {
    if (window.location.protocol === 'http') {
      this.iConfig.status['ymonitor'].error = 'Warning, please note that "https://" is required for Davis to interact with Alexa, Slack, and Watson APIs!';
      this.iConfig.status['ymonitor'].success = false;
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
    this.validate();
  }
}
