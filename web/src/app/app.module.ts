// ============================================================================
// App - MODULE
//
// This module handles all functionality for the application
// ============================================================================

// ----------------------------------------------------------------------------
// Imports
// ----------------------------------------------------------------------------
// Angular
import { NgModule,
         Injectable,
         Injector,
         ErrorHandler }           from "@angular/core";
import { BrowserModule }          from "@angular/platform-browser";
import { FormsModule }            from "@angular/forms";
import { HttpModule,
         JsonpModule }            from "@angular/http";
import { RouterModule }           from "@angular/router";
import { APP_BASE_HREF }          from '@angular/common';

// Components
import { AppComponent } from "./app.component";

// Modules
import { AuthModule }              from "./auth/auth.module";
import { ConfigurationModule }     from "./configuration/configuration.module";
import { DavisModule }             from "./davis/davis.module";
import { WizardModule }            from "./wizard/wizard.module";

// Routing
import { AppRouting } from "./app.routing";

// Services
import { ConfigGuard }  from "./auth/auth-guard/config-guard.service";
import { DavisGuard }   from "./auth/auth-guard/davis-guard.service";
import { WizardGuard }  from "./auth/auth-guard/wizard-guard.service";
import { DavisService } from "./shared/davis.service";

// Dyntrace error reporter 
declare var dtrum: any;

@Injectable()
class MyErrorHandler implements ErrorHandler {
  
  private iDavis: DavisService;
  constructor (injector: Injector) {
    setTimeout(() => {
      this.iDavis = injector.get(DavisService);
    }, 0);
  }
    
  handleError(error: any) {
    console.log(error);
    this.iDavis.globalError = "Oops! Something went wrong, please refresh this tab if issues persist.";
    if  (typeof dtrum !== "undefined") {
      dtrum.reportError(Error);
    }
  }
}

// ----------------------------------------------------------------------------
// Module
// ----------------------------------------------------------------------------
@NgModule({
  bootstrap: [
    AppComponent,
  ],
  declarations: [
    AppComponent,
  ],
  imports: [
    AuthModule,
    AppRouting,
    BrowserModule,
    ConfigurationModule,
    DavisModule,
    FormsModule,
    HttpModule,
    JsonpModule,
    RouterModule,
    WizardModule,
  ],
  providers: [
    DavisService,
    {provide: ErrorHandler, useClass: MyErrorHandler},
    {provide: APP_BASE_HREF, useValue: '/'},
    ConfigGuard,
    DavisGuard,
    WizardGuard,
  ],
})

export class AppModule { }

