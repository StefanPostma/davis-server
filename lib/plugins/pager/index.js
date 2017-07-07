'use strict';

const _ = require('lodash');

class Pager {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.firstRegex = '^(please )?(how about |show me )?(the )?first page( please)?$';
    this.lastRegex = '^(please )?(how about |show me )?(the )?last( page)?( please)?$';
    this.nextRegex = '^(please )?(how about |show me )?(the )?next( page)?( please)?$';
    this.previousRegex = '^(please )?(how about |show me |go )?(the )?(back|previous)( to the)?( page| list)?( please)?$';

    this.exactMatches = [
      this.firstRegex,
      this.lastRegex,
      this.nextRegex,
      this.previousRegex,
    ];

    this.intents = {
      setPage: {
        skipHelp: true,
        usage: 'Paging',
        phrases: [],
        lifecycleEvents: [
          'setPage',
        ],
        regex: new RegExp(this.exactMatches.join('|'), 'i'),
      },

      showPage: {
        skipHelp: true,
        usage: 'Show a page',
        phrases: [
          'I would like to see a ranked listing of issues',
          'Please show me a list of issues',
          'Show me the list',
        ],
        lifecycleEvents: ['showPage'],
      },

      pageRoute: {
        skipHelp: true,
        usage: 'Pager routing',
        phrases: [],
        lifecycleEvents: ['pageRoute'],
      },
    };

    this.hooks = {
      'setPage:setPage': this.setPage.bind(this),
      'showPage:showPage': this.showPage.bind(this),
      'pageRoute:pageRoute': this.pageRoute.bind(this),
    };
  }

  setPage(exchange, context) {
    const req = exchange.getRawRequest();

    const paging = context.paging || {};

    const intent = paging.intent;
    const items = paging.items || [];
    const lead = paging.lead;
    const step = paging.step || 3;
    const filtered = paging.filtered;
    const linkUrl = paging.linkUrl;

    const numPages = Math.ceil(items.length / step);
    const lastPage = ((numPages - 1) * step)

    const firstRegex = new RegExp(this.firstRegex, 'i');
    const lastRegex = new RegExp(this.lastRegex, 'i');
    const nextRegex = new RegExp(this.nextRegex, 'i');
    const previousRegex = new RegExp(this.previousRegex, 'i');

    let i = paging.index;

    if (exchange.button) {
      i = parseInt(context.button.value, 10);
    } else if (firstRegex.test(req)) {
      i = 0;
    } else if (nextRegex.test(req)) {
      if (i + step >= items.length) {
        return exchange.response('Already on the last page.');
      }
      i += step;
    } else if (previousRegex.test(req)) {
      if (context.lastIntent === 'showPage' || context.lastIntent === 'setPage') {
        if (i - step < 0) {
          return exchange.response('Already on the first page.');
        }
        i -= step;
      }
    } else if (lastRegex.test(req)) {
      i = lastPage;
    } else {
      throw new this.davis.classes.Error('Pager did not match.');
    }

    exchange.addContext({
      paging: {
        lead,
        index: Math.min(Math.max(i, 0), lastPage),
        intent,
        items,
        filtered,
        linkUrl,
      },
    });

    return this.davis.pluginManager.run(exchange, 'showPage');
  }

  showPage(exchange, context) {
    if (!_.isNil(context.choice)) {
      if (context.choice === false) {
        exchange.setTarget('autoFollowUp');
        return exchange.response('Is there anything else you need?').skipFollowUp();
      }

      if (exchange.choice === true) {
        delete exchange.choice;
      }

      if (context.paging.linkUrl) {
        exchange.setLinkUrl(context.paging.linkUrl);
      }

      return this.davis.pluginManager.run(exchange, 'pageRoute');
    }

    if (context.paging.linkUrl) {
      exchange.setLinkUrl(context.paging.linkUrl);
    }
    const VB = this.davis.classes.VB;
    const out = { show: new this.davis.classes.VB.Message(), text: '', say: [] };
    const paging = context.paging || {};

    if (paging.filtered) {
      exchange.filtered = true;
    }

    const items = _.map(paging.items || [], (item) => {
      const ret = {};
      const card = VB.Card.fromSlack(item.show);
      ret.show = card;
      ret.text = item.text;
      ret.say = item.say;
      ret.id = item.id;
      return ret;
    });

    const i = Math.max(paging.index || 0, 0);
    const lead = paging.lead;
    const step = paging.step || 3;
    const pageNum = Math.ceil((i + 1) / step);
    const numPages = Math.ceil(items.length / step);

    const curPage = items.slice(i, i + step);

    if (curPage.length === 0) {
      const text = "I'm sorry, it doesn't seem like there are any pages.";
      out.show.addText(text).slack();
      out.text = text;
      exchange.response(out).smartEnd();
      return;
    }

    const cards = _.filter(curPage.map(e => e.show));
    const words = _.filter(curPage.map(e => e.text));
    const says = _.filter(curPage.map(e => e.say));

    if (lead && i === 0) {
      out.show.addCard(VB.Card.fromSlack(lead.show));
      out.text += `${lead.text}  `;
      out.say.push(lead.say);
      out.show.cards[0].addFooter(`Page ${pageNum} of ${numPages}`);
    } else {
      const show = new VB.Card()
        .addText(`${items.length} total items.`)
        .addFooter(`Page ${pageNum} of ${numPages}`);

      if (lead && lead.show.author) show.setAuthor(lead.show.author);
      if (lead && lead.show.author_icon) show.setAuthorIcon(lead.show.author_icon);

      out
        .show
        .addCard(show);
    }

    out.show.addCard(cards);
    //out.text += words.join('  ');
    //if (numPages > 1) out.text += `You are on page ${pageNum} of ${numPages}. `;

    const buttons = new VB.ButtonGroup('pageRoute');

    switch (curPage.length) {
      case 1:
        if (paging.intent || items[i].intent) {
          const follow = 'Would you like to analyze this further?';
          buttons
            .addAction('Yes', 'Yes', `${items[i].intent || paging.intent}:${items[i].id}`)
            .addText(follow);
          out.text += `${words[0]}  ${follow}`;
          out.say.push(says[0], follow);
        }
        break;
      case 2:
        if (paging.intent) {
          const follow = 'Would you like to know more about either of these?';
          buttons
            .addAction('First', 'First', `${items[i].intent || paging.intent}:${items[i].id}`)
            .addAction('Second', 'Second', `${items[i + 1].intent || paging.intent}:${items[i + 1].id}`)
            .addText(follow);
          out.text += `First, ${words[0]}  Also, ${words[1]}  ${follow}`;
          out.say.push('First,', says[0], 'Also,', says[1], follow);
        }
        break;
      default:
        if (paging.intent) {
          const follow = 'Would you like to know more about the first, second, or third one?';
          buttons
            .addAction('First', 'First', `${items[i].intent || paging.intent}:${items[i].id}`)
            .addAction('Second', 'Second', `${items[i + 1].intent || paging.intent}:${items[i + 1].id}`)
            .addAction('Third', 'Third', `${items[i + 2].intent || paging.intent}:${items[i + 2].id}`)
            .addText(follow);
          out.text += `First, ${words[0]}  Second, ${words[1]}  Finally, ${words[2]}  ${follow}`;
          out.say.push('First,', says[0], 'Second,', says[1], 'Finally,', says[2], follow);
        }
    }

    if (i !== 0) {
      const btnValue = { value: i - step, replace: true, slow: false };
      buttons.addAction('Previous', 'Previous Page', btnValue);
    }

    if (i + step < items.length) {
      const btnValue = { value: i + step, replace: true, slow: false };
      buttons.addAction('Next', 'Next Page', btnValue);
      out.text += ' You can also say next.';
      out.say.push('You can also say next.');
    }

    out.show.setButtons(buttons);
    out.show = out.show.slack();
    out.say = VB.audible(out.say);

    exchange
      .setTarget('pageRoute')
      .response(out)
      .skipFollowUp();
  }

  pageRoute(exchange, context) {
    const choice = context.choice;
    const paging = context.paging || {};

    const intent = paging.intent;
    const items = paging.items || [];
    const i = Math.max(paging.index || 0, 0);
    const step = paging.step || 3;

    const curPage = items.slice(i, i + step);

    if (exchange.button) {
      const val = context.button.value.toString().split(':');
      if (val.length === 2) {
        const directIntent = val[0];
        const value = val[1];

        this.davis.logger.debug(`button had intent ${directIntent} attached with value ${value}.`);

        exchange.selected = value;
        return this.davis.pluginManager.run(exchange, directIntent);
      }

      if (context.button.name === 'Next' || context.button.name === 'Previous') return this.setPage(exchange, context);
      if (context.button.name === 'Back') return this.setPage(exchange, context);

      if (intent) {
        exchange.selected = context.button.value;
        return this.davis.pluginManager.run(exchange, intent);
      }
      this.davis.logger.error(`Tried to click a pager button and no intent was selected. context.paging: ${context.paging}`);
      return exchange.response("Oh no I'm not sure what intent to run here");
    }

    //if (_.isNil(choice)) throw new this.davis.classes.Error('No choice made');
    if (_.isNil(choice)) return this.davis.pluginManager.run(exchange, 'showPage');

    if (curPage.length === 0) {
      return exchange.response("There doesn't appear to be anything selected");
    }

    if (_.isBoolean(choice)) return this.selectedBool(exchange, context.choice, curPage, intent);
    if (_.isString(choice)) return this.selectedString(exchange, context.choice, curPage, intent);

    const item = items[i + choice];

    if (!item) return exchange.response('That is not a valid choice.');

    exchange.selected = item.id;

    return this.davis.pluginManager.run(exchange, intent);
  }

  selectedBool(exchange, choice, curPage, intent) {
    if (!choice) {
      return this.davis.pluginManager.run(exchange, 'stop');
    }

    if (curPage.length === 1) {
      return this.davis.pluginManager.run(exchange, intent);
    }

    return exchange.response('Which would you like to hear more about?').skipFollowUp();
  }

  selectedString(exchange, choice, curPage, intent) {
    switch (choice) {
      case 'last':
        exchange.selected = curPage[curPage.length - 1].id;
        break;

      case 'middle':
        if (curPage.length % 2 === 0) {
          return exchange.response("I'm not sure which one you meant.");
        }
        exchange.selected = curPage[Math.floor(curPage.length / 2)].id;
        break;

      case 'all':
        return exchange.response('You can only select one please');

      default:
        throw new this.davis.classes.Error('Invalid choice selected');
    }

    return this.davis.pluginManager.run(exchange, intent);
  }
}

module.exports = Pager;

