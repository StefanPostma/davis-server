import { Component, OnInit, AfterViewInit, 
         QueryList, SimpleChange,
         ViewChild, ViewChildren, ElementRef,
         Input, Output, EventEmitter, Pipe, 
         PipeTransform }                      from '@angular/core';
import { TimezonePipe }                            from '../timezone-pipe/timezone.pipe';

// Services
import { ConfigService }                      from '../../../config/config.service';
import { DavisService }                       from '../../../davis.service';
import * as _                                 from "lodash";
import * as moment                            from 'moment';
import * as momentz                           from 'moment-timezone';

@Component({
  selector: 'timezone-input',
  templateUrl: './input.component.html',
})
export class TimezoneInputComponent implements OnInit, AfterViewInit {
  
  @Input() value: string;
  @Output() timezoneChange: EventEmitter<any> = new EventEmitter<any>();
  
  @ViewChild('timezoneInput') timezoneInput: ElementRef;
  @ViewChildren('timezonesList') timezonesList: QueryList<ElementRef>;
  
  valid: boolean = true;
  timezones: Array<any> = [];
  highlighted: any = {
    name: '',
    offset: '',
  };

  constructor(
    public timezonePipe: TimezonePipe,
    public iDavis: DavisService,
    public iConfig: ConfigService) {}
    
  timezoneInputKeyUp(event: any) {
    
    let timezonesFilteredArray = this.timezonePipe.transform(this.timezones, this.value);
    let highlightedIndex = _.findIndex(timezonesFilteredArray, (o: any) => { return o.name == this.highlighted.name; });
    
    // Up arrow key pressed
    if (event.keyCode === 38) {
      if (highlightedIndex > 0) {
        this.highlighted.name = timezonesFilteredArray[highlightedIndex - 1].name;
        this.timezonesList.toArray()[highlightedIndex - 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.name = timezonesFilteredArray[timezonesFilteredArray.length - 1].name;
        this.timezonesList.toArray()[timezonesFilteredArray.length - 1].nativeElement.scrollIntoView(false);
      }
      
    // Down arrow key pressed
    } else if (event.keyCode === 40) {
      if (highlightedIndex < timezonesFilteredArray.length - 1) {
        this.highlighted.name = timezonesFilteredArray[highlightedIndex + 1].name;
        this.timezonesList.toArray()[highlightedIndex + 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.name = timezonesFilteredArray[0].name;
        this.timezonesList.toArray()[0].nativeElement.scrollIntoView(false);
      }
    } else if (event.keyCode === 13) {
      if (highlightedIndex > -1 && timezonesFilteredArray[highlightedIndex]) this.value = timezonesFilteredArray[highlightedIndex].name;
      if (timezonesFilteredArray && timezonesFilteredArray.length === 1) this.value = timezonesFilteredArray[0].name;
      this.timezoneInput.nativeElement.blur();
      this.validate();
    }
  }
  
  validate() {
    this.valid = this.isTimezoneMatch();
    this.timezoneChange.emit({name: this.value, valid: this.valid});
  }
  
  isTimezoneMatch(): boolean {
    var self = this;
    return _.findIndex(this.timezones, (tz: any) => { 
      if (tz.name === self.value) {
        tz.name;
      }
      return tz.name === self.value;
    }) > -1;
  }
  
  ngOnInit() {
    momentz.tz.names().forEach((tz: string) => {
      this.timezones.push({
        name: tz,
        offset: momentz.tz(tz).format('Z'),
      });
    });
  }
  
  ngAfterViewInit() {}
}
