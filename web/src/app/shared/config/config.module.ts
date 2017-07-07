// ============================================================================
// Configuration - MODULE
//
// This module handles all functionality for the Configuration components
// ============================================================================

// ----------------------------------------------------------------------------
//  Imports
// ----------------------------------------------------------------------------
// Angular
import { NgModule }                               from "@angular/core";
import { CommonModule }                           from "@angular/common";
import { FormsModule }                            from "@angular/forms";

// Components
import { ConfigAlexaComponent }                   from "./config-alexa/config-alexa.component";
import { ConfigChromeComponent }                  from "./config-chrome/config-chrome.component";
import { ConfigDynatraceConnectComponent }        from "./config-dynatrace-connect/config-dynatrace-connect.component";
import { ConfigDynatraceEntitiesComponent }       from "./config-dynatrace-entities/config-dynatrace-entities.component";
import { ConfigFilterComponent }                  from "./config-filter/config-filter.component";
import { ConfigFiltersComponent }                 from "./config-filters/config-filters.component";
import { ConfigNotificationRulesComponent }       from "./config-notification-rules/config-notification-rules.component";
import { ConfigNotificationSourceComponent }      from "./config-notification-source/config-notification-source.component";
import { ConfigSlackComponent }                   from "./config-slack/config-slack.component";
import { ConfigUserComponent }                    from "./config-user/config-user.component";
import { ConfigUsersComponent }                   from "./config-users/config-users.component";

// Services
import { ConfigService }                          from "./config.service";
import { FilterDynatraceEntitiesPipe }            from './config-dynatrace-entities-pipe/config-dynatrace-entities.pipe';
import { FilterFiltersByNamePipe }                from './config-filters-pipe/config-filters.pipe';
import { FilterUsersByNamePipe }                  from './config-users-pipe/config-users.pipe';
import { FilterSidebarItemsByAdminPipe }          from './config-sidebar-pipe/config-sidebar.pipe';

// Modules
import { TagsModule }                             from '../inputs/tags/tags.module';
import { TagsGenericModule }                      from '../inputs/tags-generic/tags-generic.module';
import { TimezoneModule }                         from '../inputs/timezone/timezone.module';

// ----------------------------------------------------------------------------
// Module
// ----------------------------------------------------------------------------
@NgModule({
  declarations: [
    ConfigAlexaComponent,
    ConfigChromeComponent,
    ConfigDynatraceConnectComponent,
    ConfigDynatraceEntitiesComponent,
    ConfigFilterComponent,
    ConfigFiltersComponent,
    ConfigNotificationRulesComponent,
    ConfigNotificationSourceComponent,
    ConfigSlackComponent,
    ConfigUserComponent,
    ConfigUsersComponent,
    FilterDynatraceEntitiesPipe,
    FilterFiltersByNamePipe,
    FilterUsersByNamePipe,
    FilterSidebarItemsByAdminPipe,
  ],
  exports: [
    ConfigAlexaComponent,
    ConfigChromeComponent,
    ConfigDynatraceConnectComponent,
    ConfigDynatraceEntitiesComponent,
    ConfigFilterComponent,
    ConfigFiltersComponent,
    ConfigNotificationRulesComponent,
    ConfigNotificationSourceComponent,
    ConfigSlackComponent,
    ConfigUserComponent,
    ConfigUsersComponent,
    FilterDynatraceEntitiesPipe,
    FilterFiltersByNamePipe,
    FilterUsersByNamePipe,
    FilterSidebarItemsByAdminPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    TagsModule,
    TagsGenericModule,
    TimezoneModule,
  ],
  providers: [
    ConfigService,
  ],
})

export class ConfigModule { }
