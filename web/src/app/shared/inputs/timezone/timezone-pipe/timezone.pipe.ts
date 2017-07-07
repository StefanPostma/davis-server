import { Pipe, PipeTransform }          from '@angular/core';
import * as _                           from "lodash";
import * as $                           from 'jquery';

@Pipe({name: 'timezonePipe'})
export class TimezonePipe implements PipeTransform {
  transform(timezones: any, str: string): any {
    if (str && str.length > 0) {
      str = str.toLowerCase().trim();
      timezones = _.filter(timezones, (tz: any) => { 
        let exploded = tz.name.split('/');
        return (exploded[0].toLowerCase().indexOf(str.replace(' ', '_')) === 0 
          || (exploded[1] && exploded[1].toLowerCase().indexOf(str.replace(' ', '_')) === 0)
          || tz.name.toLowerCase().indexOf(str.replace(' ', '_')) === 0);
      });
    }
    
    return timezones;
  }
}