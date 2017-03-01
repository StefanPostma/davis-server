// ============================================================================
// Config - SERVICE
//
// This service contains the primary functions that are used across all
// Config components.
// ============================================================================

// ----------------------------------------------------------------------------
// Imports
// ----------------------------------------------------------------------------
// Angular
import { Injectable }               from "@angular/core";
import { Location }                 from '@angular/common';
import { Http, Response }           from '@angular/http';
import { Headers, RequestOptions }  from '@angular/http';
import { DavisService }             from '../davis.service';
import { DavisModel }               from '../models/davis.model';

// ----------------------------------------------------------------------------
// Class
// ----------------------------------------------------------------------------
@Injectable()
export class ConfigService {
  // Initialize view
  view: string = "dynatrace";
  helpLinkText: string = 'How to complete this step';
  timezones: any = require('./../../../../../lib/config/timezones');
  titleGlobal: string = '';
  isWizard: boolean = false;
  isSidebarVisible: boolean = false;
  values: any = new DavisModel().config.values;
  status: any = new DavisModel().config.status;
  
  // ------------------------------------------------------
  // Inject services
  // ------------------------------------------------------
  constructor(private http: Http, public location: Location, public iDavis: DavisService) { }

  // ------------------------------------------------------
  // Select view in Wizard
  // ------------------------------------------------------
  selectView(newView: string) {
    this.view = newView;
    this.location.go(`/${ (this.isWizard) ? 'wizard' : 'configuration'}#${newView}`);
  }
  
  getDavisConfiguration(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get(`/api/v1/system/config/`, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  getDavisUsers(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get(`/api/v1/system/users`, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  updateDavisUser(user: any): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.put(`/api/v1/system/users/${user.email}`, user, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }

  addDavisUser(user: any): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/system/users/${user.email}`, user, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }

  removeDavisUser(email: string): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.delete(`/api/v1/system/users/${email}`, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  getDavisFilters(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get(`/api/v1/system/filters`, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  addDavisFilter(filter: any): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/system/filters`, filter, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  updateDavisFilter(filter: any): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.put(`/api/v1/system/filters/${filter._id}`, filter, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  removeDavisFilter(filter: any): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.delete(`/api/v1/system/filters/${filter._id}`, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  getDavisNotificationsEndpoint(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token } );
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/events/problems', options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  getYmonitor(): Promise<any> {
      let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
      let options = new RequestOptions({ headers: headers });

      return this.http.get('/api/v1/system/config/ymonitor', options)
        .toPromise()
        .then(this.iDavis.extractData)
        .catch(this.iDavis.handleError);
    }
  connectYmonitor(): Promise<any> {
      let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token } );
      let options = new RequestOptions({ headers: headers });

      return this.http.put('/api/v1/system/config/ymonitor', this.values.ymonitor, options)
        .toPromise()
        .then(this.iDavis.extractData)
        .catch(this.iDavis.handleError);
    }


  getDynatrace(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token } );
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/system/config/dynatrace', options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  connectDynatrace(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token } );
    let options = new RequestOptions({ headers: headers });

    return this.http.put('/api/v1/system/config/dynatrace', this.values.dynatrace, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }

  validateDynatrace(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token } );
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/system/config/dynatrace/validate', options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }

  connectAlexa(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.put(`/api/v1/system/users/${this.iDavis.values.user.email}`, { alexa_ids: this.iDavis.values.user.alexa_ids }, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  getSlack(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/system/config/slack', options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  getSlackChannels(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.get('/api/v1/system/slack/currentChannels', options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }

  connectSlack(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.put('/api/v1/system/config/slack', this.values.slack, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  startSlack(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post('/api/v1/system/slack/start', {}, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  removeSlackAppConfig(): Promise<any> {
    let headers = new Headers({ 'Content-Type': 'application/json', 'x-access-token': this.iDavis.token });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(`/api/v1/system/slack/delete`, {}, options)
      .toPromise()
      .then(this.iDavis.extractData)
      .catch(this.iDavis.handleError);
  }
  
  displayError(message: string, category: string): void {
    if (category) {
      this.status[category].success = false;
      this.status[category].error = message || 'Sorry an error occurred, please try again.';
    }
    if (typeof message === 'string' && message.indexOf('invalid token') > -1) {
      this.iDavis.logOut();
    }
  }
}
