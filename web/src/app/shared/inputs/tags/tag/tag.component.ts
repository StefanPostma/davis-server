import { Component, OnChanges, 
         OnInit, AfterViewInit,
         QueryList, SimpleChange,
         ViewChild, ViewChildren, ElementRef,
         Input, Output, EventEmitter, Pipe, 
         PipeTransform }                      from '@angular/core';
import { TagPipe }                            from '../tag-pipe/tag.pipe';

// Services
import { ConfigService }                      from '../../../config/config.service';
import { DavisService }                       from '../../../davis.service';
import * as _                                 from "lodash";

@Component({
  selector: 'tag',
  templateUrl: './tag.component.html',
})
export class TagComponent implements OnInit, AfterViewInit {
  
  @Input() categories: Array<any>;
  @Input() tag: any;
  @Input() focus: boolean;
  @Output() deleteEmptyTags: EventEmitter<any> = new EventEmitter();

  @ViewChild('categoryInput') categoryInput: ElementRef;
  @ViewChild('entityInput') entityInput: ElementRef;
  @ViewChild('categorySpan') categorySpan: ElementRef;
  @ViewChild('entitySpan') entitySpan: ElementRef;
  @ViewChildren('categoriesList') categoriesList: QueryList<ElementRef>;
  @ViewChildren('entitiesList') entitiesList: QueryList<ElementRef>;
  
  entities: Array<any> = [];
  highlighted: any = {
    category: '',
    name: '',
    entityId: '',
  };
  categoryFocused: boolean = false;
  entityFocused: boolean = false;
  testEntity: any = {};

  constructor(
    public tagPipe: TagPipe,
    public iDavis: DavisService,
    public iConfig: ConfigService) { }
    
  categoryInputGeneralKeyUp(event: any) {
    if (this.categories[this.tag.category]) { 
      this.entities = this.categories[this.tag.category].entities;
    } else {
      this.entities = [];
      this.tag.name = '';
      this.tag.entityId = '';
    }
  }
    
  categoryInputSpecialKeyUp(event: any) {
    if (this.categories[this.tag.category]) { 
      this.entities = this.categories[this.tag.category].entities;
    } else {
      this.tag.name = '';
      this.tag.entityId = '';
    }
    
    let categoriesFilteredArray = this.tagPipe.transform(this.categories, this.tag.category);
    let highlightedIndex = _.findIndex(categoriesFilteredArray, (o: any) => { return o && o.key == this.highlighted.category; });
    
    // Up arrow key pressed
    if (event.keyCode === 38) {
      if (highlightedIndex > 0) {
        this.highlighted.category = categoriesFilteredArray[highlightedIndex - 1].category;
        this.categoriesList.toArray()[highlightedIndex - 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.category = categoriesFilteredArray[categoriesFilteredArray.length - 1].category;
        this.categoriesList.toArray()[categoriesFilteredArray.length - 1].nativeElement.scrollIntoView(false);
      }
      
    // Down arrow key pressed
    } else if (event.keyCode === 40) {
      if (highlightedIndex < categoriesFilteredArray.length - 1) {
        this.highlighted.category = categoriesFilteredArray[highlightedIndex + 1].category;
        this.categoriesList.toArray()[highlightedIndex + 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.category = categoriesFilteredArray[0].category;
        this.categoriesList.toArray()[0].nativeElement.scrollIntoView(false);
      }
    } else if (event.keyCode === 13) {
      if (highlightedIndex > -1 && categoriesFilteredArray[highlightedIndex]) this.tag.category = categoriesFilteredArray[highlightedIndex].category;
      if (categoriesFilteredArray && categoriesFilteredArray.length === 1) this.tag.category = categoriesFilteredArray[0].category;
      if (this.categories[this.tag.category]) this.entities = this.categories[this.tag.category].entities;
      this.focusEntityInput(null);
    }
  }
  
  entityInputSpecialKeyUp(event: any) {
    
    let entitiesFilteredArray = this.tagPipe.transform(this.entities, this.tag.name);
    let highlightedIndex = _.findIndex(entitiesFilteredArray, (o: any) => { return o && o.entityId == this.highlighted.entityId; });
    
    // Up arrow key pressed
    if (event.keyCode === 38) {
      if (highlightedIndex > 0) {
        this.highlighted.name = entitiesFilteredArray[highlightedIndex - 1].name;
        this.highlighted.entityId = entitiesFilteredArray[highlightedIndex - 1].entityId;
        this.entitiesList.toArray()[highlightedIndex - 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.name = entitiesFilteredArray[entitiesFilteredArray.length - 1].name;
        this.highlighted.entityId = entitiesFilteredArray[entitiesFilteredArray.length - 1].entityId;
        this.entitiesList.toArray()[entitiesFilteredArray.length - 1].nativeElement.scrollIntoView(false);
      }
      
    // Down arrow key pressed
    } else if (event.keyCode === 40) {
      if (highlightedIndex < entitiesFilteredArray.length - 1) {
        this.highlighted.name = entitiesFilteredArray[highlightedIndex + 1].name;
        this.highlighted.entityId = entitiesFilteredArray[highlightedIndex + 1].entityId;
        this.entitiesList.toArray()[highlightedIndex + 1].nativeElement.scrollIntoView(false);
      } else {
        this.highlighted.name = entitiesFilteredArray[0].name;
        this.highlighted.entityId = entitiesFilteredArray[0].entityId;
        this.entitiesList.toArray()[0].nativeElement.scrollIntoView(false);
      }
    } else if (event.keyCode === 13) {
      if (highlightedIndex > -1 && entitiesFilteredArray[highlightedIndex]) {
        this.tag.name = entitiesFilteredArray[highlightedIndex].name;
        this.tag.entityId = entitiesFilteredArray[highlightedIndex].entityId;
        this.testEntity = entitiesFilteredArray[highlightedIndex];
      }
      if (entitiesFilteredArray && entitiesFilteredArray.length === 1) {
        this.tag.name = entitiesFilteredArray[0].name;
        this.tag.entityId = entitiesFilteredArray[0].entityId;
        this.testEntity = entitiesFilteredArray[0];
      }
      this.entityInput.nativeElement.blur();
    }
  }
  
  focusCategoryInput() {
    this.categoryFocused = true;
    // Stack Overflow workaround for ngIf timing issue 
    // http://stackoverflow.com/questions/37355768/how-to-check-whether-ngif-has-taken-effect
    setTimeout(() => {
      this.categoryInput.nativeElement.focus();
      this.focus = false;
    }, 0);
  }
  
  focusEntityInput(tag: any) {
    if (tag && tag.entity) {
      this.entities = tag.entity.entities; 
      this.tag.category = tag.category;
    } else if (tag) {
      this.entities = tag.entities;
      this.tag.category = tag.category;
    }
    this.entityFocused = true;
    setTimeout(() => {
      this.entityInput.nativeElement.focus();
    }, 0);
  }
  
  focusInput() {
    if (this.tag.name && this.tag.name.length > 0) {
      this.focusEntityInput(null);
    } else {
      this.focusCategoryInput();
    }
  }
  
  preventParentClick(event: any) {
    event.stopPropagation();
  }
  
  cloneDeep(item: any): any {
    return _.cloneDeep(item);
  }
  
  includes(items: Array<any>, item: any): boolean {
    return _.includes(items, item);
  }
  
  includesDuplicateNames(items: Array<any>, name: string): boolean {
    return _.filter(items, (item: any) => { 
      return item.name === name; 
    }).length > 1;
  }
  
  clearCategory() {
    this.entities = []; 
    this.tag.name = '';
    this.tag.entityId = '';
    this.tag.category = '';
  }
  
  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    if (changes['focus'] && this.focus) {
      if (this.tag.category && this.tag.category.length > 0) {
        this.focusEntityInput(null);
      } else {
        this.focusCategoryInput();
      }
      this.focus = false;
    }
  }
  
  ngOnInit() {}
  
  ngAfterViewInit() {}
}
