import { Pipe, PipeTransform }          from '@angular/core';
import * as _                           from "lodash";
import * as $                           from 'jquery';

@Pipe({name: 'tagPipe'})
export class TagPipe implements PipeTransform {
  transform(keys: any, str: string): any {
    if (str && str.length > 0) {
      str = str.toLowerCase().trim();
      
      // Tag values filter
      if (Array.isArray(keys)) {
        keys = _.filter(keys, (key: any) => { 
          let result = false;
          let isMatch = false;
          let isAllWordMatch = true;
          let words = key.name.split(' ');
          let strs = str.split(' ');
          
          if (key.name.toLowerCase() === str) return false;
          
          // Multiple word support
          if (words.length > 1) {
            words.forEach((word: string) => {
              if (strs.length > 1) {
                strs.forEach((st: string) => {
                  if (!isMatch) isMatch = word.toLowerCase().indexOf(st) === 0;
                });
                // Once false: result is always false
                if (isAllWordMatch) isAllWordMatch = isMatch;
              } else {
                // Once True: result is always true
                if (!result) result = word.toLowerCase().indexOf(str) === 0;
              }
            });
            if (strs.length > 1) result = isAllWordMatch;
            
          // Single word support
          } else {
            result = key.name.toLowerCase().indexOf(str) === 0;
          }
          return result;
        });
        
      // Tag keys filter
      } else {
        keys = _.filter(keys, (key: any) => { 
          return key.key.toLowerCase().includes(str); 
        });
      }
    // if str is empty
    } else if (!Array.isArray(keys)) {
      let array = [];
      for (let key in keys) {
        array.push({key: key, value: keys[key]});
      } 
      keys = array;
    }
    
    return keys;
  }
}