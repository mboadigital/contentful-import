'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = initClient;

var _contentfulManagement = require('contentful-management');

var _logging = require('contentful-batch-libs/dist/logging');

function logHandler(level, data) {
  _logging.logEmitter.emit(level, data);
}

function initClient(opts) {
  const defaultOpts = {
    timeout: 30000,
    logHandler
  };
  const config = _extends({}, defaultOpts, opts);
  return (0, _contentfulManagement.createClient)(config);
}
module.exports = exports.default;