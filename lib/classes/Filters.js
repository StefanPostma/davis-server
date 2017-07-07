'use strict';

const _ = require('lodash');

const FilterModel = require('../models/Filters');

const GLOBAL_SCOPE = 'global';

class Filters {
  constructor(davis) {
    this.logger = davis.logger;

    this.davis = davis;
  }

  getFiltersByScope(scope, origin) {
    const originRegex = (origin) ? new RegExp(`ALL|${origin}`) : /ALL/;

    const scopeArray = [];
    scopeArray.push(GLOBAL_SCOPE);

    const subScope = [];
    _.forEach(_.split(scope, ':'), (scopeElement) => {
      subScope.push(scopeElement);
      scopeArray.push(subScope.join(':'));
    });

    const scopeQuery = FilterModel
      .where('enabled', true)
      .where('origin', originRegex)
      .where('scope').in(scopeArray);

    return FilterModel.find(scopeQuery).populate('entity')
      .then((filters) => {
        const sortedFilters = _.sortBy(filters, filter => -filter.priority());
        if (sortedFilters.length > 0) {
          return _.filter(sortedFilters, filter => filter.scope === sortedFilters[0].scope);
        }
        this.davis.logger.debug('No matching filters found.');
        return [];
      });
  }

  getNotificationFilters() {
    return FilterModel.find({ enabled: true, origin: /NOTIFICATION|ALL/ }).populate('owner').populate('entity').exec();
  }

  getFilters() {
    return FilterModel.find({}).populate('owner').populate('entity').exec();
  }

  getFilter(id) {
    return FilterModel.findOne({ _id: id }).populate('owner').populate('entity').exec();
  }

  createFilter(filter) {
    const filterModel = new FilterModel(filter);
    return filterModel.save()
      .catch((err) => {
        if (err.code === 11000) {
          throw new this.davis.classes.Error('A filter with that name and scope already exists.');
        } else if (err.name === 'DavisError') {
          throw err;
        } else {
          throw new this.davis.classes.Error(err);
        }
      });
  }

  updateFilter(id, filter) {
    return FilterModel.findOneAndUpdate({ _id: id }, filter, { runValidators: true }).exec();
  }

  deleteFilter(id) {
    return FilterModel.findOne({ _id: id }).remove().exec();
  }
}

module.exports = Filters;
