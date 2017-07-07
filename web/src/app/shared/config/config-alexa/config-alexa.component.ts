import { Component, OnInit,
         AfterViewInit,
         ElementRef,
         Renderer,
         ViewChild }     from '@angular/core';

// Services
import { ConfigService } from '../config.service';
import { DavisService }  from '../../davis.service';
import * as _            from "lodash";

@Component({
  selector: 'config-alexa',
  templateUrl: './config-alexa.component.html',
})
export class ConfigAlexaComponent implements OnInit, AfterViewInit {
  
  @ViewChild('alexaIds') alexaIds: ElementRef;
  
  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Skip' : 'Save';
  isDirty: boolean = false;
  isValidAlexaID: boolean = true;

  constructor(
    private renderer: Renderer,
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    this.iDavis.values.user.alexa_id = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.alexa_id, 'alexa_id');
    if (this.iDavis.values.user.alexa_ids.length > 0) {
      this.submitButton = 'Saving...';
      this.iConfig.connectAlexa()
        .then(response => {
          if (!response.success) { 
            this.resetSubmitButton(); 
            throw new Error(response.message); 
          }
          this.iConfig.status['alexa'].success = true;
          this.iConfig.selectView('slack');
        })
        .catch(err => {
          this.iConfig.displayError(err, 'alexa');
        });
    } else {
      this.iConfig.selectView('slack');
    }
  }

  validate() {
    if (this.iDavis.values.user.alexa_id && this.iDavis.values.user.alexa_id.trim().length > 0) {
      this.iDavis.values.user.alexa_ids = [this.iDavis.values.user.alexa_id];
    } else {
      this.iDavis.values.user.alexa_ids = [];
    }
    if (this.iDavis.values.user.alexa_ids && this.iDavis.values.user.alexa_ids.length > 0) {
      this.submitButton = 'Continue';
    } else {
      this.submitButton = 'Skip';
    }
    this.isDirty = !_.isEqual(this.iDavis.values.user, this.iConfig.values.original.user);
    if (this.iDavis.values.user.alexa_ids[0] && this.iDavis.values.user.alexa_ids[0].length > 0 && (!(this.iDavis.values.user.alexa_ids[0].indexOf('amzn') > -1 
      || 'amzn'.indexOf(this.iDavis.values.user.alexa_ids[0]) > -1) || this.iDavis.values.user.alexa_ids[0].indexOf('@') > -1)) { 
      this.isDirty = false;
      this.isValidAlexaID = false;
    } else {
      this.isValidAlexaID = true;
    }
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  }

  ngOnInit() {}
  
  ngAfterViewInit() {
    this.renderer.invokeElementMethod(this.alexaIds.nativeElement, 'focus');
  }
}
