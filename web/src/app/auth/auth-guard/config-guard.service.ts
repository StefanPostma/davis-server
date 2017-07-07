// ============================================================================
// Config Guard - SERVICE
//
// This service checks to see if the default user exists before completing route
// ============================================================================

// ----------------------------------------------------------------------------
// Imports
// ----------------------------------------------------------------------------
// Angular
import { Injectable }             from "@angular/core";
import { Router, CanActivate,
         ActivatedRoute, 
         NavigationExtras,
         ActivatedRouteSnapshot, 
         RouterStateSnapshot 
}                                 from "@angular/router";

// Services
import { DavisService }           from "../../shared/davis.service";
import { ConfigService }          from '../../shared/config/config.service';

// ----------------------------------------------------------------------------
// Class
// ----------------------------------------------------------------------------
@Injectable()
export class ConfigGuard implements CanActivate {
  
  navigationExtras: NavigationExtras = {
    preserveFragment: false //This may need to be set to true in the future, possible Angular bug
  };
  
  // ------------------------------------------------------
  // Inject services
  // ------------------------------------------------------
  constructor(
    public iConfig: ConfigService,
    public iDavis: DavisService,
    public router: Router) {}

  // ------------------------------------------------------
  // Check if default user is created before routing
  // ------------------------------------------------------
  canActivate(actRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean {
    if (window.location.hash) {
      this.navigationExtras.fragment = window.location.hash.replace('#', '');
    } else if (window.location.pathname.indexOf('configuration') > -1) {
      this.navigationExtras.fragment = 'configuration';
    }
    if (!this.iConfig.isWizard && !this.iDavis.token) {
      return this.CheckUser();
    } else {
      return this.isAuthorized();
    }
  }

  // ------------------------------------------------------
  // Check if defult user exists
  // ------------------------------------------------------
  CheckUser(): Promise<any> {
    // Set default user attributes
    this.iDavis.values.authenticate.email = "admin@localhost";
    this.iDavis.values.authenticate.password = "changeme";

    // Attempt to get token
    return this.iDavis.getJwtToken()
      .then(response => this.CheckUserResponse(response))
      .catch(err => this.CheckUserError(err));
  }

  // ------------------------------------------------------
  // Handle check user response
  // ------------------------------------------------------
  CheckUserResponse(response: any) {
    if (response.success) {
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('chromeToken');
      sessionStorage.removeItem('isAdmin');
      sessionStorage.removeItem('conversation');
      this.iConfig.isWizard = true;
      this.iDavis.token = response.token;
      this.iDavis.values.user.admin = true;
      this.router.navigate(["/wizard"]);
      return false;
    } else if (sessionStorage.getItem('token') 
        && sessionStorage.getItem('isAdmin')
        && sessionStorage.getItem('email')) {
      this.iConfig.isWizard = false;
      this.iDavis.token = sessionStorage.getItem('token');
      this.iDavis.isAuthenticated = true;
      this.iDavis.isAdmin = sessionStorage.getItem('isAdmin') === 'true';
      this.iDavis.chromeToken = sessionStorage.getItem('chromeToken');
      if (!this.iDavis.socket && this.iDavis.chromeToken) this.iDavis.connectSocket();
      this.iDavis.values.authenticate.email = sessionStorage.getItem('email');
      return this.isAuthorized();
    } else {
      this.iConfig.isWizard = false;
      this.router.navigate(["/auth/login"], this.navigationExtras);
      return false;
    }
  }

  // ------------------------------------------------------
  // Handle check user error
  // ------------------------------------------------------
  CheckUserError(error: any) {
    this.iConfig.isWizard = false;
    this.router.navigate(["/auth/login"], this.navigationExtras);
    return false;
  }
  
  isAuthorized(): boolean {
    if (!this.iDavis.isAdmin && (
      this.navigationExtras.fragment === 'alexa'
      || this.navigationExtras.fragment === 'dynatrace-connect' 
      || this.navigationExtras.fragment === 'slack' 
      || this.navigationExtras.fragment === 'notification-source'
    )) {
      this.navigationExtras.fragment = '';
      this.router.navigate(["/davis"], this.navigationExtras);
      return false;
    } else {
      return true;
    }
  }
}
