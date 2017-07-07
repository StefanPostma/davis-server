import {Injectable}                from '@angular/core';
import { Router }                  from '@angular/router';
import { Http, Response }          from '@angular/http';
import { Headers, RequestOptions } from '@angular/http';
import { Subject }                 from 'rxjs/Subject';
import { Observable }              from 'rxjs/Observable';
import { DavisModel }              from './models/davis.model';
import * as moment                 from 'moment';
import * as momentz                from 'moment-timezone';
import * as $                      from 'jquery';
import * as io                     from 'socket.io-client';

@Injectable()
export class DavisService {

  isAdmin: boolean = false;
  isAuthenticated: boolean = false;
  davisVersion: string;
  globalError: string;
  previousLocationPath: string;

  token: string;
  chromeToken: string;
  fullScreenImageUrl: string;
  newNotificationCount: number = 0;
  isTyping: boolean = false;
  isBreadcrumbsVisible: boolean = false;
  isUserMenuVisible: boolean = false;
  isIframeTile: boolean = false;
  isScrolledToBottom: boolean = true;
  isAddingToConvo: boolean = false;

  conversation: Array<any> = [];
  url: string;  
  socket: any;

  route_names: any = {
    '/wizard': 'Setup',
    '/configuration': 'Account settings',
    '/configuration#user': 'Account settings',
    '/configuration#users': 'Account settings',
    '/configuration#dynatrace-applications': 'Account settings',
    '/configuration#dynatrace-services': 'Account settings',
    '/configuration#dynatrace-connect': 'Account settings',
    '/configuration#filters': 'Account settings',
    '/configuration#notification-rules': 'Account settings',
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

    this.conversation = [];
    this.isUserMenuVisible = false;
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.token = null;
    if (this.socket) this.socket.disconnect();
    this.socket = null;
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('chromeToken');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('conversation');
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

  askDavisButton(callback_id: string, name: string, value: string) {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/web`, { button: { name: name, value: value }, callback_id: callback_id }, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  getChromeToken() {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/webAuth`, {}, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }
  
  connectSocket() {
    if (!this.socket && this.chromeToken) {
      this.socket = io();
      this.socket.on('connect', () => {
        this.socket.emit('registerSocket', {id: this.socket.id, email: this.values.user.email, token: this.chromeToken, isWeb: true });
      });
      this.socket.on('connect_failed', () => {
        this.globalError = 'Push notifications are disabled due to a socket connection error';
      });
      this.socket.on(this.chromeToken, (card: any) => {
        if (this.chromeToken && typeof card !== 'string') this.displayNotification(card, false);
      });
      this.socket.on('message', (card: any) => {
        if (typeof card !== 'string') this.displayNotification(card, true);
      });
    }
  }
  
  displayNotification(card: any, isToAll: boolean) {
    this.newNotificationCount++;
    if (this.isTyping) {
      let typingPollingInterval = setInterval(() => {
        if (!this.isTyping) {
          this.stopTypingPollingInterval(typingPollingInterval);
          this.conversation.push({ visual: { card: card }, isDavis: true, isNotif:  true, timestamp: this.getTimestamp() });
          sessionStorage.setItem('conversation', JSON.stringify(this.conversation));
          if (this.router.url === '/davis') this.windowScrollBottom('slow');
        }
        this.isTyping = false;
      }, 5000);
    } else {
      this.conversation.push({ visual: { card: card }, isDavis: true, isNotif:  true, timestamp: this.getTimestamp() });
      sessionStorage.setItem('conversation', JSON.stringify(this.conversation));
      if (this.router.url === '/davis') this.windowScrollBottom('slow');
    }
  }
  
  deleteNotification(card: any) {
    this.conversation.forEach((message: any, index: number) => {
      if (message === card) this.conversation.splice(index, 1);
    });
    sessionStorage.setItem('conversation', JSON.stringify(this.conversation));
  }
  
  stopTypingPollingInterval(interval: any) {
    clearInterval(interval);
  }

  extractData(res: Response): any {
    let body = res.json();
    return body || {};
  }

  handleError(error: Response | any): any {
    let errMsg: string;
    if (error instanceof Response) {
      if (error.status === 0) {
        errMsg = 'The connection to Davis was lost!';
      } else  {
        errMsg = `${error.status} - ${error.statusText}`;
      }
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    return Promise.reject(errMsg);
  }
  
  testGlobalErrorHandler() {
    let test = null;
    test = test[0].toUpperCase();
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
    this.isScrolledToBottom = true;
    $('html, body').animate({ scrollTop: $(document).height() }, speed);
  }

  windowScrolled(): void {
    var self = this;
    $(window).scroll(function() {
      if($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
        self.isScrolledToBottom = true;
      } else {
        self.isScrolledToBottom = false;
      }
    });
  }
  
  getWindowHeight(): number {
    return $(window).height();
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
  
  getMoment(): any {
    return moment();
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
