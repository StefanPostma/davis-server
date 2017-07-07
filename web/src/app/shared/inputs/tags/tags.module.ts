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
import { TagComponent }             from "./tag/tag.component";
import { TagsInputComponent }       from "./input/input.component";

// Services
import { TagPipe }                  from './tag-pipe/tag.pipe';

// ----------------------------------------------------------------------------
// Module
// ----------------------------------------------------------------------------
@NgModule({
  declarations: [
    TagComponent,
    TagsInputComponent,
    TagPipe,
  ],
  exports: [
    TagComponent,
    TagsInputComponent,
    TagPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: [
    TagPipe,
  ],
})

export class TagsModule { }
