// ============================================================================
// Shared davis - MODULE
//
// This module handles all functionality for the davis components
// ============================================================================

// ----------------------------------------------------------------------------
//  Imports
// ----------------------------------------------------------------------------
// Angular
import { NgModule }                 from "@angular/core";
import { CommonModule }             from "@angular/common";
import { FormsModule }              from "@angular/forms";

// Components
import { TimezoneInputComponent }   from "./input/input.component";

// Services
import { TimezonePipe }             from './timezone-pipe/timezone.pipe';

// ----------------------------------------------------------------------------
// Module
// ----------------------------------------------------------------------------
@NgModule({
  declarations: [
    TimezoneInputComponent,
    TimezonePipe,
  ],
  exports: [
    TimezoneInputComponent,
    TimezonePipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: [
    TimezonePipe,
  ],
})

export class TimezoneModule { }
