'use strict';

const _ = require('lodash');
const Problems = require('../../classes/Dynatrace/Problems');

class Problem {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      problem: {
        title: 'Discover problems',
        usage: 'Ask about current or historical problems',
        examples: [
          'What happened yesterday?',
          'Were there any issues this morning?',
          'Are there any capacity issues right now?',
        ],
        phrases: [
          "what's up?",
          'what is up?',
          "How's {{APP}} doing?",
          'any issues',
          'Are there any issues at the moment?',
          'Are there any on going issues?',
          'Did anything happen to {{APP}} {{DATETIME}}?',
          'Did anything happen to {{APP}}?',
          'Did anything happen with {{APP}} {{DATETIME}}?',
          'Did anything happen {{DATETIME}}',
          'Did anything happen',
          'Did anything happened to {{APP}} {{DATETIME}}?',
          'did anything happened {{DATETIME}}?',
          'what happened with {{APP}} {{DATETIME}}',
          'What happened {{DATETIME}} with {{APP}}?',
          'What happened {{DATETIME}}?',
          'Are there any capacity issues?',
          'Are there any capacity issues {{DATETIME}}?',
          'Are there any capacity issues affecting {{APP}}?',
          'Are there any scalability issues?',
          'Are there any scalability issues {{DATETIME}}?',
          'Are there any scalability issues affecting {{APP}}?',
          'How is my application scaling?',
          'How is {{APP}} scaling?',
          "How's my application scaling?",
          "How's {{APP}} scaling?",
          "How's my app scaling?",
          'how are we scaling {{DATETIME}}?',
          'Tell me about the latest problem.',
          'What was the most recent issue?',
          'What was the latest problem?',
        ],
        lifecycleEvents: [
          'gatherData',
          'problem',
          'updateTS',
        ],
        nlp: true,
        clarification: 'I think you were asking about problems.',
      },
    };

    this.hooks = {
      'problem:gatherData': this.gatherData.bind(this),
      'problem:problem': this.problem.bind(this),
      'problem:updateTS': exchange => exchange.user.updateProblemTS && exchange.user.updateProblemTS(),
    };
  }

  gatherData(exchange, context) {
    const VB = this.davis.classes.VB;
    const isInfra = /infrastructure|scalability|scaling|capacity/i.test(exchange.getRawRequest());
    const isLast = /(last|most recent|latest) (issue|problem)/i.test(exchange.getRawRequest()) && exchange.intents[0] !== 'catchUp';
    const tense = this.davis.utils.getTense(exchange);

    const timeRange = context.timeRange;

    const eContext = {
      isLast,
      tense,
      category: (isInfra) ? 'INFRASTRUCTURE' : null,
    };

    exchange.addExchangeContext(eContext);

    exchange
      .setTarget('problemDetails');

    if (isLast) {
      return this.davis.dynatrace.getFilteredProblems(exchange, { relativeTime: 'month' })
        .then((ret) => {
          const problems = ret.toArray();
          const lastProblem = _.maxBy(problems, p => p.startTime);
          if (lastProblem) {
            exchange
              .setLinkUrl(this.davis.linker.problem(lastProblem))
              .addContext({ problems: [lastProblem] });
          } else {
            exchange.addContext({ problems: [] });
          }
        });
    }

    return this.davis.dynatrace.getFilteredProblems(exchange)
      .then((ret) => {
        const dateRange = new VB.TimeRange(timeRange, exchange.user.timezone);
        const summary = ret.summarize(exchange, dateRange);
        let problems = ret.toArray();
        problems = (isInfra) ?
          _.filter(problems, p =>
            p.impactLevel === 'APPLICATION' &&
            p.affectedCounts.INFRASTRUCTURE + p.recoveredCounts.INFRASTRUCTURE > 0) : problems;

        exchange
          .setLinkUrl(this.davis.linker.problems(exchange.getTimeRange()))
          .addContext({ problems, summary });
      });
  }

  problem(exchange, context) {
    const linkUrl = this.davis.linker.problems(exchange.getTimeRange());
    const VB = this.davis.classes.VB;

    const nlp = exchange.getNlpData();
    const app = nlp.app.name;

    const problems = _.map(context.problems, problem =>
        Problems.problemSummary(problem, context, 'problemDetails', this.davis));

    problems.forEach((problem) => {
      problem.text = VB.stringify(problem.text);
      problem.show = problem.show.slack();
      problem.say = VB.audible(problem.say);
    });

    if (context.tense === 'future') {
      return exchange.response("I can't see the future yet!").smartEnd();
    }

    if (context.isLast) {
      if (context.problems.length > 0) {
        exchange.selected = context.problems[0].id;
        exchange.addContext({ paging: null });
        return this.davis.pluginManager.run(exchange, 'problemDetails');
      }

      return (app) ?
        exchange.response(`There were no recent issues affecting ${app}.`).smartEnd() :
        exchange.response('There were no recent issues.').smartEnd();
    }

    const lead = {
      show: new VB.Card().addText(context.summary),
      text: VB.stringify(context.summary),
      say: VB.audible(context.summary),
    };

    lead.show.setFiltered(exchange.filtered);

    lead.show = lead.show.slack();

    if (problems.length === 0) {
      return exchange.response(lead.text);
    }

    exchange
      .addContext({
        paging: {
          linkUrl,
          lead: null,
          intent: 'problemDetails',
          index: 0,
          items: problems,
          filtered: exchange.filtered,
        },
      });

    // return this.davis.pluginManager.run(exchange, 'showPage');
    if (problems.length === 1) {
      return exchange
        .addContext({ pid: problems[0].id })
        .setTarget('problemDetails')
        .response(lead)
        .followUp('Would you like to hear more details?');
    }

    if (problems.length <= 3) {
      return this.davis.pluginManager.run(exchange, 'showPage');
    }

    return exchange.setTarget('showPage').response(lead).followUp('Would you like to hear a ranked listing of issues?');
  }

  problemsLink(problems, timeRange, category) {
    const VB = this.davis.classes.VB;
    const num = this.davis.textHelpers.numString(problems.length);
    const s = (num !== 'one') ? 's' : '';
    const url = this.davis.textHelpers.buildProblemsUrl(null, timeRange);
    const text = (category) ?
      `${num} ${category.toLowerCase()} related problem${s}` :
      `${num} problem${s}`;
    return new VB.Link(url, text);
  }
}

module.exports = Problem;

