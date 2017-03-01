import {Injectable}                from '@angular/core';
import { Router }                  from '@angular/router';
import { Http, Response }          from '@angular/http';
import { Headers, RequestOptions } from '@angular/http';
import { DavisModel }              from './models/davis.model';
import * as moment                 from 'moment';
import * as momentz                from 'moment-timezone';
import * as $                      from 'jquery';

@Injectable()
export class DavisService {

  isAdmin: boolean = false;
  isAuthenticated: boolean = false;
  davisVersion: string;

  token: string;
  isBreadcrumbsVisible: boolean = false;
  isUserMenuVisible: boolean = false;
  isIframeTile: boolean = false;

  conversation: Array<any> = [];
  
  route_names: any = {
    '/wizard': 'Setup',
    '/configuration': 'Account settings',
    '/configuration#user': 'Account settings',
    '/configuration#users': 'Account settings',
    '/configuration#dynatrace': 'Account settings',
    '/configuration#filters': 'Account settings',
    '/configuration#notification-filters': 'Account settings',
    '/configuration#notification-source': 'Account settings',
    '/configuration#slack': 'Account settings',
    '/configuration#chrome': 'Account settings',
    '/configuration#ymonitor': 'Account settings',
  };
  
  values: any = new DavisModel().davis.values;

  constructor (private http: Http, private router: Router) { }
  
  goToPage(location: string): void {
    if (this.router.url !== '/wizard') {
      
      if (location === '/davis') {
        this.windowScrollBottom(1);
      } else {
        this.windowScrollTop();
      }
      
      this.router.navigate([location]);
      this.isUserMenuVisible = false;
    }
  }
  
  toggleUserMenu(): void {
    this.isUserMenuVisible = !this.isUserMenuVisible;
  }
  
  logOut(): void {
    
    this.values.authenticate = new DavisModel().davis.values.authenticate;
    this.values.user = new DavisModel().davis.values.user;
    
    this.isUserMenuVisible = false;
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.token = null;
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('isAdmin');
    this.windowScrollTop();
    this.router.navigate(["/auth/login"]);
  }

  getJwtToken(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/authenticate', { email: this.values.authenticate.email, password: this.values.authenticate.password }, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  getDavisUser(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get(`/api/v1/system/users/${this.values.authenticate.email}`, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  getDavisVersion(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/system/version', options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  askDavisPhrase(phrase: string) {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/web`, { phrase: phrase, timezone: this.values.user.timezone }, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  askDavisIntent(intent: string, name: string, value: string) {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });
    
    return this.http.post(`/api/v1/web`, { button: { name: name, value: value }, intent: intent }, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  extractData(res: Response): any {
    let body = res.json();
    return body || {};
  }

  handleError(error: Response | any): any {
    let errMsg: string;
    if (error instanceof Response) {
      errMsg = `${error.status} - ${error.statusText}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.error(errMsg);
    return Promise.reject(errMsg);
  }
  
  isIframeTileDetected(): boolean {
    let result = false;
    try {
      result = window.self !== window.top;
    } catch (e) {
      result = true;
    }
    
    if (result) {
      $('body').addClass('iFrameTile');
    }
    
    return result;
  }

  windowLocation(url:string): void {
    window.location.assign(url);
  }

  windowOpen(url:string): void {
    this.isUserMenuVisible = false;
    window.open(url);
  }
  
  windowScrollTop(): void {
    window.scrollTo(0, 0);
  }
  
  windowScrollBottom(speed: any): void {
    $('html, body').animate({ scrollTop: $(document).height() }, speed);
  }
  
  log(output: any): void {
    console.log(output);
  }

  focusDavisInputOnKeyDown() : void {
    var self = this;
    var last = -1;
    var last2 = -1;
    $(document).keydown(function(event) {
      if (last2 !== event.which) last2 = last;
      last = event.which;
      if (window.location.pathname === '/davis' && event.which != 17 && last != 17 && last2 != 17 && !$('#davisInput').is(":focus")) {
        $('#davisInput').focus();
        self.windowScrollBottom('slow');
      }
    });
  }
  
  blurDavisInput(): void {
    $('#davisInput').blur();
  }
  
  addToChrome(): void {
    window.open('https://chrome.google.com/webstore/detail/kighaljfkdkpbneahajiknoiinbckfpg');
  }
  
  clickElem(id: string): void {
    document.getElementById(id).click();
  }

  getTimezone(): string {
    return momentz.tz.guess();
  }
  
  getTimestamp(): string {
    return moment().format('LTS');
  }
  
  safariAutoCompletePolyFill(input: string, id: string): string {
    let value = $(`#${id}`).val();
    
    // Checkbox workaround
    if( $(`#${id}`).attr('type') === 'checkbox' ) {
      value = $(`#${id}`).is(':checked');
    }
    
    if (value && input !== value) input = value;
    return input;
  }

}