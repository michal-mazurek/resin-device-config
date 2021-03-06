
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

/**
 * @module deviceConfig
 */
var Promise, errors, network, resin, revalidator, schema, _;

_ = require('lodash');

Promise = require('bluebird');

resin = require('resin-sdk');

errors = require('resin-errors');

revalidator = require('revalidator');

network = require('./network');

schema = require('./schema');


/**
 * @summary Generate a basic config.json object
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {Object} params - user params
 *
 * @returns {Object} config.json
 *
 * @example
 * config = deviceConfig.generate
 * 	application:
 * 		app_name: 'HelloWorldApp'
 * 		id: 18
 * 		device_type: 'raspberry-pi'
 * 	user:
 * 		id: 7
 * 		username: 'johndoe'
 * 	pubnub:
 * 		subscribe_key: 'demo'
 * 		publish_key: 'demo'
 * 	mixpanel:
 * 		token: 'e3bc4100330c35722740fb8c6f5abddc'
 * 	apiKey: 'asdf'
 * 	vpnPort: 1723
 * 	endpoints:
 * 		api: 'https://api.resin.io'
 * 		vpn: 'vpn.resin.io'
 * 		registry: 'registry.resin.io'
 * ,
 * 	network: 'ethernet'
 * 	appUpdatePollInterval: 50000
 *
 * console.log(config)
 */

exports.generate = function(options, params) {
  var config;
  if (params == null) {
    params = {};
  }
  _.defaults(options, {
    vpnPort: 1723
  });
  config = {
    applicationName: options.application.app_name,
    applicationId: options.application.id,
    deviceType: options.application.device_type,
    userId: options.user.id,
    username: options.user.username,
    files: network.getFiles(params),
    appUpdatePollInterval: params.appUpdatePollInterval || 60000,
    listenPort: 48484,
    vpnPort: options.vpnPort,
    apiEndpoint: options.endpoints.api,
    vpnEndpoint: options.endpoints.vpn,
    registryEndpoint: options.endpoints.registry,
    deltaEndpoint: options.endpoints.delta,
    pubnubSubscribeKey: options.pubnub.subscribe_key,
    pubnubPublishKey: options.pubnub.publish_key,
    mixpanelToken: options.mixpanel.token,
    apiKey: options.apiKey
  };
  if (params.network === 'wifi') {
    config.wifiSsid = params.wifiSsid;
    config.wifiKey = params.wifiKey;
  }
  exports.validate(config);
  return config;
};


/**
 * @summary Validate a generated config.json object
 * @function
 * @public
 *
 * @param {Object} config - generated config object
 * @throws Will throw if there is a validation error
 *
 * @example
 * config = deviceConfig.generate
 * 	application:
 * 		app_name: 'HelloWorldApp'
 * 		id: 18
 * 		device_type: 'raspberry-pi'
 * 	user:
 * 		id: 7
 * 		username: 'johndoe'
 * 	pubnub:
 * 		subscribe_key: 'demo'
 * 		publish_key: 'demo'
 * 	mixpanel:
 * 		token: 'e3bc4100330c35722740fb8c6f5abddc'
 * 	apiKey: 'asdf'
 * 	vpnPort: 1723
 * 	endpoints:
 * 		api: 'https://api.resin.io'
 * 		vpn: 'vpn.resin.io'
 * 		registry: 'registry.resin.io'
 * ,
 * 	network: 'ethernet'
 * 	appUpdatePollInterval: 50000
 *
 * deviceConfig.validate(config)
 */

exports.validate = function(config) {
  var disallowedProperty, error, validation;
  validation = revalidator.validate(config, schema, {
    cast: true
  });
  if (!validation.valid) {
    error = _.first(validation.errors);
    throw new Error("Validation: " + error.property + " " + error.message);
  }
  disallowedProperty = _.chain(config).keys().difference(_.keys(schema.properties)).first().value();
  if (disallowedProperty != null) {
    throw new Error("Validation: " + disallowedProperty + " not recognized");
  }
};


/**
 * @summary Get a device configuration object from an application
 * @public
 * @function
 *
 * @param {String} application - application name
 * @param {Object} [options={}] - options
 * @param {String} [options.wifiSsid] - wifi ssid
 * @param {String} [options.wifiKey] - wifi key
 *
 * @returns {Promise<Object>} device configuration
 *
 * @todo Move this to the SDK
 *
 * @example
 * deviceConfig.getByApplication 'App1',
 * 	network: 'wifi'
 * 	wifiSsid: 'foobar'
 * 	wifiKey: 'hello'
 * .then (configuration) ->
 * 	console.log(configuration)
 */

exports.getByApplication = function(application, options) {
  if (options == null) {
    options = {};
  }
  return Promise.props({
    application: resin.models.application.get(application),
    apiKey: resin.models.application.getApiKey(application),
    userId: resin.auth.getUserId(),
    username: resin.auth.whoami(),
    apiUrl: resin.settings.get('apiUrl'),
    vpnUrl: resin.settings.get('vpnUrl'),
    registryUrl: resin.settings.get('registryUrl'),
    deltaUrl: resin.settings.get('deltaUrl'),
    pubNubKeys: resin.models.config.getPubNubKeys(),
    mixpanelToken: resin.models.config.getMixpanelToken()
  }).then(function(results) {
    var config;
    if (results.username == null) {
      throw new errors.ResinNotLoggedIn();
    }
    config = exports.generate({
      application: results.application,
      user: {
        id: results.userId,
        username: results.username
      },
      pubnub: results.pubNubKeys,
      mixpanel: {
        token: results.mixpanelToken
      },
      apiKey: results.apiKey,
      endpoints: {
        api: results.apiUrl,
        vpn: results.vpnUrl,
        registry: results.registryUrl,
        delta: results.deltaUrl
      }
    }, options);
    exports.validate(config);
    return config;
  });
};


/**
 * @summary Get a device configuration object from a device
 * @public
 * @function
 *
 * @param {String} uuid - device uuid
 * @param {Object} [options={}] - options
 * @param {String} [options.wifiSsid] - wifi ssid
 * @param {String} [options.wifiKey] - wifi key
 *
 * @returns {Promise<Object>} device configuration
 *
 * @todo Move this to the SDK
 *
 * @example
 * deviceConfig.getByDevice '7cf02a6',
 * 	network: 'wifi'
 * 	wifiSsid: 'foobar'
 * 	wifiKey: 'hello'
 * .then (configuration) ->
 * 	console.log(configuration)
 */

exports.getByDevice = function(uuid, options) {
  if (options == null) {
    options = {};
  }
  return resin.models.device.get(uuid).then(function(device) {
    return exports.getByApplication(device.application_name, options).then(function(config) {
      config.registered_at = Math.floor(Date.now() / 1000);
      config.deviceId = device.id;
      config.uuid = device.uuid;
      exports.validate(config);
      return config;
    });
  });
};
