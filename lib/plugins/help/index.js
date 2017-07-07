'use strict';

const _ = require('lodash');

class Help {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      help: {
        usage: 'Ask for help',
        phrases: [
          'Help me please.',
          'Help me.',
          'I could use a little help.',
          'I need help',
          'for some help',
          'to help me',
          'what can you do',
        ],
        lifecycleEvents: [
          'help',
        ],
        regex: /^help$/i,
        skipHelp: true,
      },
    };

    this.hooks = {
      'help:help': this.help.bind(this),
    };
  }

  help(exchange, context) {
    if (context.choice !== undefined && !context.choice) return this.davis.pluginManager.run(exchange, 'stop');

    const Card = this.davis.classes.VB.Card;
    const msg = new this.davis.classes.VB.Message();

    const intents = this.davis.pluginManager.intents;
    const intentNames = _.keys(intents);
    const helpCard = new Card();

    const textHelps = [];

    _.map(intentNames, (name) => {
      const intent = intents[name];
      if (intent.skipHelp) return;
      const title = intent.title || intent.usage || name;

      const examples = _.take(intent.examples || intent.phrases, 3);
      const slackExamples = examples.map(e => `- ${e}`);

      if (examples.length > 0) {
        textHelps.push(_.sample(examples));
        helpCard.addField(title, slackExamples.join('\n'), true);
      }
    });

    msg.addText('Here are some of the things I can do.')
      .addCard(helpCard);

    return exchange.response({
      show: msg.slack(),
      text: `I'm davis, your personal dev ops assistant. You can ask me about problems, user activity levels, and much more. Try asking one of these questions. ${_.sampleSize(textHelps, 5).join(' ')} For a more complete listing of my capabilities, consult my documentation on the GitHub wiki page.`,
      say: `I'm davis, your personal dev ops assistant. You can ask me about problems, user activity levels, and much more. Try asking one of these questions. ${_.sampleSize(textHelps, 5).join(' <p /> ')} For a more complete listing of my capabilities, consult my documentation on the GitHub wiki page.`,
    })
      .setLinkUrl('https://github.com/Dynatrace/davis-server/wiki');
  }
}

module.exports = Help;
