'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = parseOptions;

var _path = require('path');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _package = require('../package');

var _headers = require('./utils/headers');

var _proxy = require('contentful-batch-libs/dist/proxy');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SUPPORTED_ENTITY_TYPES = ['contentTypes', 'tags', 'entries', 'assets', 'locales', 'webhooks', 'editorInterfaces'];

function parseOptions(params, contentParse) {
  const defaultOptions = {
    skipContentModel: false,
    skipLocales: false,
    skipContentPublishing: false,
    useVerboseRenderer: false,
    environmentId: 'master',
    rawProxy: false,
    uploadAssets: false,
    rateLimit: 7
  };

  const configFile = params.config ? require((0, _path.resolve)(process.cwd(), params.config)) : {};

  const options = _extends({}, defaultOptions, configFile, params, {
    headers: params.headers || (0, _headers.getHeadersConfig)(params.header)

    // Validation
  });if (!options.spaceId) {
    throw new Error('The `spaceId` option is required.');
  }

  if (!options.managementToken) {
    throw new Error('The `managementToken` option is required.');
  }

  if (options.contentModelOnly && options.skipContentModel) {
    throw new Error('`contentModelOnly` and `skipContentModel` cannot be used together');
  }

  if (options.skipLocales && !options.contentModelOnly) {
    throw new Error('`skipLocales` can only be used together with `contentModelOnly`');
  }

  if (!options.awsAccessKey || !options.awsSecret) {
    throw new Error('AWS Credentials is not setup please provide `awsAccessKey` or `awsSecret`');
  }

  if (!options.bucketName) {
    throw new Error('The `bucketName` option is required');
  }

  if (!options.folderName) {
    throw new Error('The `folderName` option is required');
  }

  const proxySimpleExp = /.+:\d+/;
  const proxyAuthExp = /.+:.+@.+:\d+/;
  if (typeof options.proxy === 'string' && options.proxy && !(proxySimpleExp.test(options.proxy) || proxyAuthExp.test(options.proxy))) {
    throw new Error('Please provide the proxy config in the following format:\nhost:port or user:password@host:port');
  }

  options.startTime = (0, _moment2.default)();

  if (!options.errorLogFile) {
    options.errorLogFile = (0, _path.resolve)(process.cwd(), `contentful-import-error-log-${options.spaceId}-${options.startTime.format('YYYY-MM-DDTHH-mm-SS')}.json`);
  } else {
    options.errorLogFile = (0, _path.resolve)(process.cwd(), options.errorLogFile);
  }

  // Further processing
  options.accessToken = options.managementToken;

  if (contentParse) {
    if (!options.content) {
      throw new Error('Either the `contentFile` or `content` option are required.');
    }

    // Clean up content to only include supported entity types
    Object.keys(options.content).forEach(type => {
      if (SUPPORTED_ENTITY_TYPES.indexOf(type) === -1) {
        delete options.content[type];
      }
    });

    SUPPORTED_ENTITY_TYPES.forEach(type => {
      options.content[type] = options.content[type] || [];
    });
  }

  if (typeof options.proxy === 'string') {
    options.proxy = (0, _proxy.proxyStringToObject)(options.proxy);
  }

  if (!options.rawProxy && options.proxy) {
    options.httpsAgent = (0, _proxy.agentFromProxy)(options.proxy);
    delete options.proxy;
  }

  options.application = options.managementApplication || `contentful.import/${_package.version}`;
  options.feature = options.managementFeature || 'library-import';
  return options;
}
module.exports = exports.default;