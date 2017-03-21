/**
   * Add an app to NLP
   *
   * @param {Object} obj
   * @param {String} obj.name
   * @param {String} obj.category
   * @param {String} obj.entityId
   * @param {Object} obj.display
   * @param {String} obj.display.visual - The displayable name of the app
   * @param {String} obj.display.audible - The SSML name of the app
   * @param {Array} obj.aliases - Any names (case insensitive) that the app might be called
   *
   * @memberOf Nlp
   */
  addApp(obj) {
    this.apps.push(obj);
  }