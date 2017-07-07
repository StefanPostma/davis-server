import { Component, OnInit, AfterViewInit, 
         Input, Output, EventEmitter, Pipe, 
         PipeTransform }                      from '@angular/core';

// Services
import { ConfigService }                      from '../../../config/config.service';
import { DavisService }                       from '../../../davis.service';
import * as _                                 from "lodash";

@Component({
  selector: 'tags-input',
  templateUrl: './input.component.html',
})
export class TagsInputComponent implements OnInit, AfterViewInit {
  
  @Input() tags: any;
  @Output() tagsChange: EventEmitter<any> = new EventEmitter();

  keys: any = {
    'Application': {
      key: 'Application',
      values: [],
    },
    'Service': {
      key: 'Service',
      values: [],
    },
  };
  focus: Array<boolean> = [];

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) {}
    
  addTag() {
    let obj = this.tags[this.tags.length - 1];
    if (!obj || (obj.key && obj.key.length > 0 && obj.value && obj.value.name && obj.value.name.length > 0)) {
      this.tags.push({ key: null, value: { _id: null, name: null, entityId: null } });
      this.focus.push(true);
      this.tagsChange.emit();
    } else {
      setTimeout(() => {
        this.focus[this.focus.length - 1] = true;
        this.focus = _.cloneDeep(this.focus);
      },0);
    }
  }
  
  deleteEmptyTags() {
    let index = this.tags.length;
    while (index--) {
      if ((!this.tags[index].key || (this.tags[index].key && this.tags[index].key.length < 1)) 
        && index < this.tags.length && this.tags.length > 1) {
        this.tags.splice(index, 1);
        this.focus.splice(index, 1);
        this.tagsChange.emit();
      }
    }
    this.tagsChange.emit();
  }
  
  preventParentClick(event: any) {
    event.stopPropagation();
  }
  
  ngOnInit() {
    if (this.tags) {
      this.tags.forEach((tag: any) => {
        this.focus.push(false);
      });
    }
    
    this.iConfig.getDynatraceApplications()
      .then(response => {
        if (!response.success) throw new Error(response.message);
        
        response.applications.forEach((application: any) => {
          this.keys['Application'].values.push({ _id: application._id, name: application.name, entityId: application.entityId });
        });
        return this.iConfig.getDynatraceServices();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        
        response.services.forEach((service: any) => {
         this.keys['Service'].values.push({ _id: service._id, name: service.name, entityId: service.entityId });
        });
      })
      .catch(err => {
        this.iConfig.displayError(err, 'filter');
      });
      
    this.iConfig.values.original.filter = _.cloneDeep(this.iConfig.values.filter);
    this.tagsChange.emit();
  }
  
  ngAfterViewInit() {}
}
