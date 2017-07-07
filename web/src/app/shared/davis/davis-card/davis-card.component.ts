import { Component, OnInit, AfterViewInit,
         trigger, transition, style, animate, state,
         Input, Output, EventEmitter, Pipe,
         PipeTransform }                      from '@angular/core';

// Services
import { ConfigService }                      from '../../config/config.service';
import { DavisService }                       from '../../davis.service';
import * as _                                 from "lodash";

@Component({
  selector: 'davis-card',
  templateUrl: './davis-card.component.html',
  animations: [
    trigger('update', [
      state('updating', style({maxHeight: '450px', opacity: '0.0'})),
      state('updated, void', style({maxHeight: '800px', opacity: '1.0'})),
      transition('updating <=> updated', [
        animate('300ms'),
      ]),
    ])
  ],
})
export class DavisCardComponent implements OnInit, AfterViewInit {

  @Input() message: any;
  @Input() isDavis: boolean;
  @Output() toggleProcessingIndicator: EventEmitter<any> = new EventEmitter();

  updateState: string;

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  addToConvo(callback_id: string, name: string, value: string) {
    if (name !== 'Next' && name !== 'Previous') {
      this.toggleProcessingIndicator.emit();
    } else {
      this.updateState = 'updating';
    }
    this.iDavis.askDavisButton(callback_id, name, value)
      .then(result => {
        if (!result.success) throw new Error(result.response);
        if (typeof result.response === 'string') {
          result.response = {
            visual: {
              card: {
                attachments: [
                  {
                    text: result.response,
                  },
                ],
              }
            },
            isDavis: true,
          };
        } else {
          result.response.isDavis = true;
        }
        result.response.timestamp = this.iDavis.getTimestamp();
        result.response.moment = this.iDavis.getMoment();
        
        // Add new card
        if (name !== 'Next' && name !== 'Previous') {
          this.toggleProcessingIndicator.emit();
          if (this.iDavis.conversation.length > 20) this.iDavis.conversation.shift();
          this.iDavis.isAddingToConvo = true;
          this.iDavis.conversation.push(result.response);
          sessionStorage.setItem('conversation', JSON.stringify(this.iDavis.conversation));
          
        // Update card if page change
        } else {
          this.message = result.response;
          this.updateState = 'updated';
          this.iDavis.windowScrollBottom('slow');
        }
      })
      .catch(err => {
        if (typeof err === 'string' && err.indexOf('403') > -1) {
            this.iDavis.logOut();
        } else {
          if (typeof err !== 'string' && err.message) err = err.message;
          let message = { visual: { card: { text: err, error: true } }, isDavis: true };
          this.iDavis.conversation.push(message);
          sessionStorage.setItem('conversation', JSON.stringify(this.iDavis.conversation));
        }
      });
  }

  doSubmit() {}

  ngOnInit() {}

  ngAfterViewInit() {
    if (this.iDavis.isAddingToConvo) {
      this.iDavis.windowScrollBottom('slow');
      this.iDavis.isAddingToConvo = false;
    }
  }
}
