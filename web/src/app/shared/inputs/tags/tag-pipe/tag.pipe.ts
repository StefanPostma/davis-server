import { Pipe, PipeTransform }          from '@angular/core';
import * as _                           from "lodash";
import * as $                           from 'jquery';

@Pipe({name: 'tagPipe'})
export class TagPipe implements PipeTransform {
  transform(categories: any, str: string): any {
    if (str && str.length > 0) {
      str = str.toLowerCase().trim();
      
      // Tag values filter
      if (Array.isArray(categories)) {
        categories = _.filter(categories, (category: any) => { 
          let result = false;
          let isMatch = false;
          let isAllWordMatch = true;
          let words = category.name.split(' ');
          let strs = str.split(' ');
          
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
            result = category.name.toLowerCase().indexOf(str) === 0;
          }
          return result;
        });
        
      // Tag categories filter
      } else {
        categories = _.filter(categories, (category: any) => { 
          return category.category.toLowerCase().includes(str); 
        });
      }
    // if str is empty
    } else if (!Array.isArray(categories)) {
      let array = [];
      for (let category in categories) {
        array.push({category: category, name: categories[category].name, entityId: categories[category].entityId });
      } 
      categories = array;
    }
    
    return categories;
  }
}