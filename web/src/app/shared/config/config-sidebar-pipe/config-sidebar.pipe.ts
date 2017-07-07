import { Pipe, PipeTransform } from '@angular/core';
import * as _ from "lodash";

@Pipe({ name: 'filterSidebarItemsByAdminPipe' })
export class FilterSidebarItemsByAdminPipe implements PipeTransform {
  transform(items: any, isAdmin: boolean): any {
    items = _.filter(items, (item: any) => { 
      return (!item.admin && item.name !== 'Notification Filters' )  || (item.admin && isAdmin); 
    });
    return items;
  }
}