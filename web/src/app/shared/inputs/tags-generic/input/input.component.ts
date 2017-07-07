import { Component, OnInit, AfterViewInit,
         ElementRef, ViewChild, ViewChildren,
         Input, Output, EventEmitter, Pipe, 
         PipeTransform }                      from '@angular/core';

// Services
import { ConfigService }                      from '../../../config/config.service';
import { DavisService }                       from '../../../davis.service';
import * as _                                 from "lodash";

@Component({
  selector: 'tags-generic-input',
  templateUrl: './input.component.html',
})
export class TagsGenericInputComponent implements OnInit, AfterViewInit {
  
  @Input() tags: any;
  @Output() tagsChange: EventEmitter<any> = new EventEmitter();
  @ViewChildren('tagInput') tagInputs: any;
  
  focused: boolean = false;

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) {}
    
  addTag() {
    let tag = this.tags[this.tags.length - 1];
    if (typeof tag === 'undefined' || tag.length > 0) {
      this.tags.push('');
      this.tagsChange.emit();
    }
  }
  
  deleteEmptyTags() {
    let index = this.tags.length;
    while (index--) {
      if (typeof this.tags[index] !== 'string' || this.tags[index].length < 1) {
        this.tags.splice(index, 1);
        this.tagsChange.emit();
      }
    }
    this.focused = false;
  }
  
  focusBlur(input: any) {
    if (typeof input !== 'string' || input.length === 0) {
      this.deleteEmptyTags();
    }
    this.focused = false;
    this.tagsChange.emit();
  }
  
  customTrackBy(index: number, obj: any): any {
    return index;
  }
  
  preventParentEvent(event: any) {
    event.stopPropagation();
  }
    
  ngOnInit() {
    this.tagsChange.emit();
  }
  
  ngAfterViewInit() {
    this.tagInputs.changes.subscribe((elements: any) => {
      if (elements && elements.last && elements.last.nativeElement.value.trim() === '') {
        elements.last.nativeElement.focus();
      }
    });
  }
}
