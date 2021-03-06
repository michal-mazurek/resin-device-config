
/*
Copyright 2016 Resin.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
var settings, _;

_ = require('lodash');

settings = require('./settings');


/**
 * @summary Get network configuration files
 * @protected
 * @function
 *
 * @param {Object} [options={}] - options
 * @param {String} [options.wifiSsid] - wifi ssid
 * @param {String} [options.wifiKey] - wifi key
 *
 * @returns {Object} Network configuration files
 *
 * @example
 * files = network.getFiles
 * 	wifiSsid: 'foobar'
 * 	wifiKey: 'hello'
 */

exports.getFiles = function(options) {
  if (options == null) {
    options = {};
  }
  if (!_.isPlainObject(options)) {
    throw new Error("Invalid options: " + options);
  }
  return {
    'network/settings': settings.main,
    'network/network.config': settings.getHomeSettings(options)
  };
};
