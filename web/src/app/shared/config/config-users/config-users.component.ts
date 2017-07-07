import { Component, OnInit, AfterViewInit,
         Pipe, PipeTransform }   from '@angular/core';
import { FormBuilder }                              from '@angular/forms';
import { Router }                                   from '@angular/router';
import { ConfigService }                            from '../config.service';
import { DavisService }                             from '../../davis.service';
import { DavisModel }                               from '../../models/davis.model';
import * as _                                       from "lodash";

@Component({
    selector: 'config-users',
    templateUrl: './config-users.component.html',
})
export class ConfigUsersComponent implements OnInit, AfterViewInit {

    submitted: boolean = false;
    submitButton: string = 'Save';
    isPasswordFocused: boolean = false;
    isPasswordMasked: boolean = true;
    addUser: boolean = true;
    editUser: boolean = false;
    users: any = [];
    filterName: string = '';
    
    constructor(public iDavis: DavisService, public iConfig: ConfigService, public router: Router) {}
    
    addMode() {
      this.iConfig.values.otherUser = new DavisModel().config.values.otherUser;
      this.iConfig.values.otherUser.timezone = this.iDavis.getTimezone();
      this.iConfig.values.original.otherUser = _.cloneDeep(this.iConfig.values.otherUser);
      this.filterName = '';
    }

    editMode(user: any) {
      this.editUser = true;
      this.iConfig.values.original.otherUser = user;
      if (this.iConfig.values.original.otherUser.alexa_ids && this.iConfig.values.original.otherUser.alexa_ids.length > 0) {
        this.iConfig.values.original.otherUser.alexa_id = this.iConfig.values.original.otherUser.alexa_ids[0];
      } else {
        this.iConfig.values.original.otherUser.alexa_id = '';
      }
      this.iConfig.values.otherUser = _.cloneDeep(user);
      this.filterName = '';
    }

    getUsers() {
      this.iConfig.getDavisUsers()
        .then(response => {
          if (!response.success) throw new Error(response.message);
          
          this.iConfig.values.users = response.users;
          _.remove(this.iConfig.values.users, (user: any) => {
            return user.email === this.iDavis.values.user.email;
          });
          this.iConfig.values.users.forEach( (user: any, index: number) => {
            if (!user.name) {
              this.iConfig.values.users[index].name = {first:'',last:''};
            } else {
              if (!user.name.first) this.iConfig.values.users[index].name.first = '';
              if (!user.name.last) this.iConfig.values.users[index].name.last = '';
            }
            this.iConfig.values.users[index].password = '';
          });
          this.users = _.cloneDeep(response.users);
        })
        .catch(err => {
          this.iConfig.displayError(err, 'users');
        });
    }

    showUsers() {
      this.getUsers();
      this.addUser = false;
      this.editUser = false;
      this.iConfig.values.original.otherUser = new DavisModel().config.values.otherUser;
    }

    updateFilter(input: any) {
      this.filterName = input.value;
    }

    ngOnInit() {
      this.iConfig.values.otherUser = new DavisModel().config.values.otherUser;
    }
    
    ngAfterViewInit() {
      this.getUsers();
    }

}
