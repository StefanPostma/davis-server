const moment = require('moment');

const locations = {
  SYNTHETIC: '#monitors/webcheckdetail;webcheckId',
  HOST: '#hostdetails;id',
  APPLICATION: '#uemappmetrics;uemapplicationId',
  MOBILE_APPLICATION: '#mobileappoverview;appId',
  SERVICE: '#services/servicedetails;id',
  PROCESS: '#processdetails;id',
  HYPERVISOR: '#hypervisordetails;id',
  PROCESS_GROUP_INSTANCE: '#processdetails;id',
  SYNTHETIC_TEST: '#webcheckdetailV3;webcheckId',
  DCRUM_APPLICATION: '#entity;id',
};

class Linker {
  constructor(davis) {
    this.davis = davis;
  }

  home() {
    return this.davis.config.getDynatraceUrl();
  }

  /**
   * Build the url for viewing a problem in the platform
   * @param {Object} problem
   * @return {String} problem url
   */
  problem(problem) {
    return `${this.home()}/#problems;filter=watched/problemdetails;pid=${problem.id};cacheBust=${moment().valueOf()}`;
  }

  /**
   * Build the url for viewing problems in the platform
   * @param {Object} problems
   * @param {Object} timeRange
   * @return {String} problems url
   */
  problems(timeRange) {
    const timeFilter = (timeRange.startTime && timeRange.stopTime) ?
      `;gtf=c_${timeRange.startTime}_${timeRange.stopTime}` :
      ';gtf=l_2_HOURS';

    return `${this.home()}/#problems${timeFilter}`;
  }

  /**
   * Build the url for viewing an event in the platform
   * @param {Object} problem
   * @param {Object} event
   * @return {String} event url
   */
  event(problem, event) {
    const eventEntityType = event.entityId.split('-')[0];
    const modifier = locations[eventEntityType];

    if (!modifier) {
      this.davis.logger.warn(`Entity type ${eventEntityType} does not have a configured link template for events`);
      return this.problem(problem);
    }

    return `${this.home()}/${modifier}=${event.entityId};gtf=p_${problem.id};pid=${problem.id}`;
  }

  /**
   * Build the url for viewing user behavior in a time frame
   * @param {String} applicationId
   * @param {Object} timeRange
   * @return {string} user activity url
   */
  userActivity(applicationId, timeRange) {
    const range = timeRange || {};

    const timeFilter = (range.startTime && range.stopTime) ?
      `;gtf=c_${range.startTime}_${range.stopTime}` :
      ';gtf=l_2_HOURS';

    return `${this.home()}/#uemapplications/uemappmetrics;uemapplicationId=${applicationId}${timeFilter};visiblepart=sessions`;
  }

  vrp(pid) {
    // https://cdojfgmpzd.live.dynatrace.com/#vres;pid=-4502208762326885074
    return `${this.home()}/#vres;pid=${pid}`;
  }

  smartScape() {
    return `${this.home()}/#smartscape`;
  }

  rootCause(problem) {
    // https://cdojfgmpzd.live.dynatrace.com/#hostdetails;id=HOST-2DE619321ED7EF4B;gtf=p_-3622019608616690816;pid=-3622019608616690816
    return this.event(problem, problem.rankedEvents[0]);
  }
}

module.exports = Linker;
