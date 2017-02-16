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

  categories: any = {
    'applications': {
      category: 'applications',
      entities: [],
    },
    'services': {
      category: 'services',
      entities: [],
    },
  };
  focus: Array<boolean> = [];

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) {}
    
  addTag() {
    let obj = this.tags[this.tags.length - 1];
    if (obj.category && obj.category.length > 0 && obj.name && obj.name.length > 0) {
      this.tags.push({ category: null, name: null, entityId: null });
      this.focus.push(true);
    } else {
      this.focus[this.focus.length - 1] = false;
      setTimeout(() => {
        this.focus[this.focus.length - 1] = true;
      },0);
    }
  }
  
  deleteEmptyTags() {
    let index = this.tags.length;
    while (index--) {
      if (this.tags[index].category.length < 1 && index < this.tags.length && this.tags.length > 1) {
        this.tags.splice(index, 1);
        this.focus.splice(index, 1);
      }
    }
  }
  
  preventParentClick(event: any) {
    event.stopPropagation();
  }
  
  ngOnInit() {
    this.tags.forEach((tag: any) => {
      this.focus.push(false);
    });
    this.tags.push({ category: null, name: null, entityId: null });
    this.focus.push(false);
    
    this.iConfig.getDynatraceApplications()
      .then(response => {
        if (!response.success) throw new Error(response.message);
        
        response.applications.forEach((application: any) => {
          this.categories['applications'].entities.push({ name: application.name, entityId: application.entityId });
        });
        return this.iConfig.getDynatraceServices();
      })
      .then(response => {
        if (!response.success) throw new Error(response.message);
        
        response.services.forEach((service: any) => {
         this.categories['services'].entities.push({ name: service.name, entityId: service.entityId });
        });
      })
      .catch(err => {
        this.iConfig.displayError(err, 'filter');
      });
  }
  
  ngAfterViewInit() {}
}
