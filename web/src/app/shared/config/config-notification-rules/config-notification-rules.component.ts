import { Component, OnInit, AfterViewInit, Pipe, 
         PipeTransform }                            from '@angular/core';
import { FormBuilder }                              from '@angular/forms';
import { Router }                                   from '@angular/router';
import { ConfigService }                            from '../config.service';
import { DavisService }                             from '../../davis.service';
import { DavisModel }                               from '../../models/davis.model';
import { CommonModel }                              from '../../models/common.model';
import * as _                                       from "lodash";

@Component({
  selector: 'config-notification-rules',
  templateUrl: './config-notification-rules.component.html',
})
export class ConfigNotificationRulesComponent implements OnInit, AfterViewInit {

  submitted: boolean = false;
  submitButton: string = 'Save';
  isPasswordFocused: boolean = false;
  isPasswordMasked: boolean = true;
  addFilter: boolean = true;
  editFilter: boolean = false;
  filters: any = [];
  filterName: string = '';
  
  constructor(public iDavis: DavisService, public iConfig: ConfigService, public router: Router) {}
  
  addMode() {
    this.addFilter = true;
    this.editFilter = false;
    this.iConfig.values.original.filter = new CommonModel().filter;
    this.iConfig.values.filter = new CommonModel().filter;
    this.filterName = '';
  }

  editMode(filter: any) {
    this.addFilter = false;
    this.editFilter = true;
    this.iConfig.values.original.filter = filter;
    this.iConfig.values.filter = _.cloneDeep(filter);
    this.filterName = '';
  }

  getFilters() {
    this.iConfig.getDavisFilters()
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.filters = response.filters;
        this.filters = _.cloneDeep(response.filters);
      })
      .catch(err => {
        this.iConfig.displayError(err, 'filters');
      });
  }

  showFilters() {
    this.getFilters();
    this.addFilter = false;
    this.editFilter = false;
    this.iConfig.values.original.filter = new CommonModel().filter;
  }
  
  saveFilter(filter: any) {
    this.iConfig.updateDavisFilter(filter)
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.status['filters'].success = true;
      })
      .catch(err => {
        this.iConfig.displayError(err, 'filter');
      });
  }

  updateFilter(input: any) {
    this.filterName = input.value;
  }

  ngOnInit() {
    if (!this.iDavis.isAdmin) this.addFilter = false;
    this.getFilters();
    this.iConfig.values.filter = new CommonModel().filter;
    this.iConfig.values.original.filter = new CommonModel().filter;
  }
  
  ngAfterViewInit() {
    this.iConfig.getDavisFilters()
      .then(response => {
        if (!response.success) throw new Error(response.message);
        this.iConfig.values.filters = response.filters;
        this.iConfig.values.filter.owner = this.iDavis.values.user._id;
      })
      .catch(err => {
        this.iConfig.displayError(err, null);
      });
  }

}
