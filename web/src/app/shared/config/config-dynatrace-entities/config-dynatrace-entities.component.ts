import { Component, OnInit,
         Input,
         AfterViewInit,
         ElementRef,
         Renderer,
         ViewChild }      from '@angular/core';

// Services
import { ConfigService }  from '../config.service';
import { DavisService }   from '../../davis.service';
import * as _ from "lodash";

@Component({
  selector: 'config-dynatrace-entities',
  templateUrl: './config-dynatrace-entities.component.html',
})
export class ConfigDynatraceEntitiesComponent implements OnInit, AfterViewInit {

  @Input() category: string;
  
  submitted: boolean = false;
  submitButton: string = 'Save';
  isDirty: boolean = false;
  editEntity: boolean = false;
  filterText: string = '';

  constructor(
    private renderer: Renderer,
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    this.submitButton = 'Saving...';
    
    // Delete last alias if empty
    if (this.iConfig.values.entity.aliases[this.iConfig.values.entity.aliases.length - 1] === '') {
      this.iConfig.values.entity.aliases.splice(this.iConfig.values.entity.aliases.length - 1, 1);
    }
    
    let entity = {
      aliasId: this.iConfig.values.entity._id,
      audible: this.iConfig.values.entity.display.audible,
      visual:  this.iConfig.values.entity.display.visual,
      aliases: this.iConfig.values.entity.aliases,
    };
   
    this.iConfig.setDynatraceAliases(entity, this.category)
      .then(response => {
        if (!response.success) {
          this.resetSubmitButton();
          throw new Error(response.message); 
        }
        
        this.iConfig.status['dynatrace-entities'].success = true;
        return this.iConfig.getDynatraceAliases();
      })
      .then(response => {
        if (!response.success) {
          this.resetSubmitButton();
          throw new Error(response.message); 
        }
        
        this.editEntity = false;
        this.resetSubmitButton();
      })
      .catch(err => {
        this.resetSubmitButton();
        this.iConfig.displayError(err, 'dynatrace-entities');
      });
  }
  
  editMode(entity: any) {
    this.editEntity = true;
    this.filterText = '';
    this.iConfig.values.entity = entity;
    this.iConfig.values.original.entity = _.cloneDeep(entity);
  }
  
  updateFilter(input: any) {
    this.filterText = input.value;
  }

  validate() {
    let test = _.cloneDeep(this.iConfig.values.entity);
    
    // Delete empty alias
    if (test.aliases[test.aliases.length - 1] === '' 
      || typeof test.aliases[test.aliases.length - 1] !== 'string') {
        test.aliases.splice(test.aliases.length - 1, 1);
    }
    this.isDirty = !_.isEqual(test, this.iConfig.values.original.entity);
  }

  resetSubmitButton() {
    this.submitButton = 'Save';
  }

  ngOnInit() {
  }
  
  ngAfterViewInit() {
    this.iConfig.getDynatraceAliases()
      .then(response => {
        if (!response.success) {
          throw new Error(response.message); 
        }
        this.iConfig.status['dynatrace-entities'].success = true;
        this.iConfig.values.entities = response.aliases;
      })
      .catch(err => {
        this.iConfig.displayError(err, 'dynatrace-entities');
      });
  }
}
