// ============================================================================
// Shared davis - MODULE
//
// This module handles all functionality for the davis components
// ============================================================================

// ----------------------------------------------------------------------------
//  Imports
// ----------------------------------------------------------------------------
// Angular
import { NgModule }                  from "@angular/core";
import { CommonModule }              from "@angular/common";
import { FormsModule }               from "@angular/forms";

// Components
import { TagsGenericInputComponent } from "./input/input.component";

// Services

// ----------------------------------------------------------------------------
// Module
// ----------------------------------------------------------------------------
@NgModule({
  declarations: [
    TagsGenericInputComponent,
  ],
  exports: [
    TagsGenericInputComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: [
  ],
})

export class TagsGenericModule { }
