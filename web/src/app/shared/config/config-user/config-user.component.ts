import { Component, OnInit,
         AfterViewInit,
         ElementRef,
         Renderer,
         ViewChild,
         Input, Output, 
         EventEmitter }           from '@angular/core';

// Services
import { ConfigService }          from '../config.service';
import { DavisService }           from '../../davis.service';
import { DavisModel }             from '../../models/davis.model';
import * as _                     from 'lodash';

@Component({
  selector: 'config-user',
  templateUrl: './config-user.component.html',
})
export class ConfigUserComponent implements OnInit, AfterViewInit {

  @Input() isMyUser: boolean;
  @Input() isNewUser: boolean;
  @Output() showUsersList: EventEmitter<any> = new EventEmitter();
  @ViewChild('first') first: ElementRef;

  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  submitButtonDefault: string = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  isPasswordFocused: boolean = false;
  isPasswordMasked: boolean = true;
  isSelectOpened: boolean = false;
  isDirty: boolean = false;
  isValidTimezone: boolean = true;
  isValidAlexaID: boolean = true;
  detectedTimezone: string = '';
  confirmDeleteUser: boolean = false;
  user: any;

  constructor(
    private renderer: Renderer,
    public iDavis: DavisService,
    public iConfig: ConfigService) {}

  doSubmit() {
    this.submitted = true;
    this.submitButton = (this.isNewUser) ? 'Adding User...' : 'Saving...';
    
    // // Safari autocomplete polyfill - https://github.com/angular/angular.js/issues/1460
    if (!this.iConfig.isWizard && !this.isMyUser) {
      this.iConfig.values.otherUser.name.first = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.name.first, 'first');
      this.iConfig.values.otherUser.name.last = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.name.last, 'last');
      this.iConfig.values.otherUser.email = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.email, 'email');
      this.iConfig.values.otherUser.password = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.password, 'password');
      this.iConfig.values.otherUser.admin = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.admin, 'admin');
      this.iConfig.values.otherUser.demo = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.demo, 'demo');
      this.iConfig.values.otherUser.timezone = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.timezone, 'timezone');
      this.iConfig.values.otherUser.alexa_id = this.iDavis.safariAutoCompletePolyFill(this.iConfig.values.otherUser.alexa_id, 'alexa_id');
    } else {
      this.iDavis.values.user.name.first = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.name.first, 'first');
      this.iDavis.values.user.name.last = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.name.last, 'last');
      this.iDavis.values.user.email = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.email, 'email');
      this.iDavis.values.user.password = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.password, 'password');
      this.iDavis.values.user.demo = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.demo, 'demo');
      this.iDavis.values.user.timezone = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.timezone, 'timezone');
      this.iDavis.values.user.alexa_id = this.iDavis.safariAutoCompletePolyFill(this.iDavis.values.user.alexa_id, 'alexa_id');
    }
    
    if (this.iDavis.values.user.password === '' || typeof this.iDavis.values.user.password === 'undefined') delete this.iDavis.values.user.password;
    if (this.iConfig.values.otherUser.password === '' || typeof this.iConfig.values.otherUser.password === 'undefined') delete this.iConfig.values.otherUser.password;
    
    this.user = (!this.iConfig.isWizard && !this.isMyUser) ? _.cloneDeep(this.iConfig.values.otherUser) : _.cloneDeep(this.iDavis.values.user);
    
    // Remove properties that shouldn't persist through user save 
    if (this.user.alexa_id || this.user.alexa_id === '') delete this.user.alexa_id;

    if ((!this.iConfig.isWizard && !this.isNewUser) || (!this.iConfig.isWizard && this.isMyUser)) {
      this.iConfig.updateDavisUser(this.user)
        .then(response => {
          if (!response.success) throw new Error(response.message);

          this.isDirty = false;
          this.iConfig.status['user'].success = true;
          this.submitButton = 'Save';
          if (this.iDavis.values.user.password) delete this.iDavis.values.user.password;
          if (this.iConfig.values.otherUser.password) delete this.iConfig.values.otherUser.password;
          if (this.isMyUser) {
            this.iDavis.values.user.__v++;
            this.user.__v++;
            this.iConfig.values.original.user = _.cloneDeep(this.user);
          } else {
            this.showUsersList.emit();
          }
        })
        .catch(err => {
          this.iConfig.displayError(err, 'user');
          this.submitButton = this.submitButtonDefault;
        });
    } else {
      this.iConfig.addDavisUser(this.user)
        .then(response => {
          if (!response.success) throw new Error(response.message);
      
          this.iConfig.status['user'].success = true;
          this.iConfig.status['user'].error = null;
          this.iConfig.values.otherUser = new DavisModel().config.values.otherUser;
          
          this.iConfig.values.otherUser.timezone = this.iDavis.getTimezone();
          this.iConfig.values.original.otherUser = _.cloneDeep(this.iConfig.values.otherUser);
          
          if (this.iConfig.isWizard) {
            
            this.iConfig.values.original.user = _.cloneDeep(this.user);
            this.isDirty = false;
            
            // Authenticate new user, update token
            this.iDavis.values.authenticate.email = this.user.email;
            this.iDavis.values.authenticate.password = this.user.password;
            this.iDavis.getJwtToken()
              .then(
                response => {
                  if (!response.success) throw new Error(response.message);
                  
                  this.iDavis.token = response.token;
                  this.iConfig.selectView('alexa');
                  sessionStorage.setItem('email', this.iDavis.values.user.email);
                  sessionStorage.setItem('token', response.token);
                  sessionStorage.setItem('isAdmin', response.admin);
                  this.submitButton = this.submitButtonDefault;
                  if (this.iDavis.values.user.password) delete this.iDavis.values.user.password;
                  if (this.iConfig.values.otherUser.password) delete this.iConfig.values.otherUser.password;
                  
                  // Delete admin@localhost user
                  this.deleteUser('admin@localhost');
              })
              .catch(err => {
                this.iConfig.displayError(err, 'user');
                this.submitButton = this.submitButtonDefault;
              });
            
          } else {
             this.iConfig.values.original.otherUser = _.cloneDeep(this.user);
             this.showUsersList.emit();
          }
      })
      .catch(err => {
        this.iConfig.displayError(err, 'user');
        this.submitButton = this.submitButtonDefault;
      });
    }
  }

  deleteUser(email: string) {
    if (this.confirmDeleteUser) {
      this.iConfig.removeDavisUser(email)
        .then(response => {
          if (!response.success) throw new Error(response.message);
          
          this.isDirty = false;
          this.iConfig.status['user'].success = true;
          this.confirmDeleteUser = false;
          this.showUsersList.emit();
        })
        .catch(err => {
          this.iConfig.displayError(err, 'user');
        });
    } else {
      this.confirmDeleteUser = true;
    }
  }

  validate() {
    if (this.isMyUser) {
      if (this.iDavis.values.user.alexa_id && this.iDavis.values.user.alexa_id.trim().length > 0) {
        this.iDavis.values.user.alexa_ids = [this.iDavis.values.user.alexa_id];
      } else {
        this.iDavis.values.user.alexa_ids = [];
      }
    } else if (this.iConfig.values.otherUser) {
      if (this.iConfig.values.otherUser.alexa_id && this.iConfig.values.otherUser.alexa_id.trim().length > 0) {
        this.iConfig.values.otherUser.alexa_ids = [this.iConfig.values.otherUser.alexa_id];
      } else {
        this.iConfig.values.otherUser.alexa_ids = [];
      }
    }
    
    // Remove alexa_id property for _.isEqual() to work correctly
    let user = (this.isMyUser) ? _.cloneDeep(this.iDavis.values.user) :  _.cloneDeep(this.iConfig.values.otherUser);
    let userOriginal = (this.isMyUser) ? _.cloneDeep(this.iConfig.values.original.user) :  _.cloneDeep(this.iConfig.values.original.otherUser);
    delete user.alexa_id;
    delete userOriginal.alexa_id;
    if (typeof this.iConfig.values.original.otherUser.alexa_id === 'string') delete this.iConfig.values.original.otherUser.alexa_id;
    this.isDirty = !_.isEqual(user, userOriginal);
    if (!this.isValidTimezone) this.isDirty = false;
    if (user.alexa_ids[0] && user.alexa_ids[0].length > 0 && (!(user.alexa_ids[0].indexOf('amzn') > -1 
      || 'amzn'.indexOf(user.alexa_ids[0]) > -1) || user.alexa_ids[0].indexOf('@') > -1)) { 
      this.isDirty = false;
      this.isValidAlexaID = false;
    } else {
      this.isValidAlexaID = true;
    }
  }

  ngOnInit() {
    if (this.isNewUser) {
      this.submitButtonDefault = 'Add User';
      this.submitButton = 'Add User';
    } else {
      if (this.iConfig.values.otherUser && this.iConfig.values.otherUser.alexa_ids && this.iConfig.values.otherUser.alexa_ids.length > 0) {
        this.iConfig.values.otherUser.alexa_id = this.iConfig.values.otherUser.alexa_ids[0];
      } else if (this.iDavis.values.user && this.iDavis.values.user.alexa_ids && this.iDavis.values.user.alexa_ids.length > 0) {
        this.iDavis.values.user.alexa_id = this.iDavis.values.user.alexa_ids[0];
      }
    }

    this.detectedTimezone = this.iDavis.getTimezone();
    if (this.iConfig.isWizard) {
      this.iDavis.values.user.timezone = this.iDavis.getTimezone();
    } else if (this.isNewUser){
      this.iConfig.values.otherUser.timezone = this.iDavis.getTimezone();
    }
  }
  
  ngAfterViewInit() {
    if (this.isNewUser || this.iConfig.isWizard) {
      this.renderer.invokeElementMethod(this.first.nativeElement, 'focus');
    }
    this.validate();
    
    if (this.iConfig.isWizard) this.iConfig.titleGlobal = 'Setup';
    
    if (this.isMyUser && !this.iConfig.isWizard) {
      this.iDavis.getDavisUser()
        .then(response => {
          if (!response.success) throw new Error(response.message); 
          this.iDavis.values.user = response.user;
          this.iDavis.isAdmin = response.user.admin;
          sessionStorage.setItem('isAdmin', response.user.admin);
          if (this.iDavis.values.user.alexa_ids && this.iDavis.values.user.alexa_ids.length > 0) {
            this.iDavis.values.user.alexa_id = this.iDavis.values.user.alexa_ids[0];
          } else {
            this.iDavis.values.user.alexa_id = '';
          }
          this.iDavis.values.user.password = '';
  
          // Backwards compatibility, was once optional
          if (!response.user.name) {
            this.iDavis.values.user.name = { first: '', last: '' };
          } else {
            if (!response.user.name.first) this.iDavis.values.user.name.first = '';
            if (!response.user.name.last) this.iDavis.values.user.name.last = '';
          }
          this.iConfig.values.original.user = _.cloneDeep(this.iDavis.values.user);
        })
        .catch(err => {
          this.iConfig.displayError(err, null);
        });
    }
  }
}
