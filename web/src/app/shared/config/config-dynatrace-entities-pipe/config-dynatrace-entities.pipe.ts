import { Pipe, PipeTransform } from '@angular/core';
import * as _ from "lodash";

@Pipe({name: 'filterDynatraceEntities'})
export class FilterDynatraceEntitiesPipe implements PipeTransform {
  transform(entities: any, str: string): any {
    if (!str || str.length < 1) {
      return entities;
    }
    
    entities = _.filter(entities, (entity: any) => { 
      return entity.name.toLowerCase().indexOf(str.toLowerCase()) > -1 || entity.entityId.toLowerCase().indexOf(str.toLowerCase()) > -1; 
    });
    return entities;
  }
}