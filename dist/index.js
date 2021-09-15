'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cliTable = require('cli-table3');

var _cliTable2 = _interopRequireDefault(_cliTable);

var _listr = require('listr');

var _listr2 = _interopRequireDefault(_listr);

var _listrUpdateRenderer = require('listr-update-renderer');

var _listrUpdateRenderer2 = _interopRequireDefault(_listrUpdateRenderer);

var _listrVerboseRenderer = require('listr-verbose-renderer');

var _listrVerboseRenderer2 = _interopRequireDefault(_listrVerboseRenderer);

var _lodash = require('lodash');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _pQueue = require('p-queue');

var _pQueue2 = _interopRequireDefault(_pQueue);

var _logging = require('contentful-batch-libs/dist/logging');

var _listr3 = require('contentful-batch-libs/dist/listr');

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _initClient = require('./tasks/init-client');

var _initClient2 = _interopRequireDefault(_initClient);

var _getDestinationData = require('./tasks/get-destination-data');

var _getDestinationData2 = _interopRequireDefault(_getDestinationData);

var _pushToSpace = require('./tasks/push-to-space/push-to-space');

var _pushToSpace2 = _interopRequireDefault(_pushToSpace);

var _transformSpace = require('./transform/transform-space');

var _transformSpace2 = _interopRequireDefault(_transformSpace);

var _assets = require('./tasks/push-to-space/assets');

var _validations = require('./utils/validations');

var _parseOptions = require('./parseOptions');

var _parseOptions2 = _interopRequireDefault(_parseOptions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const ONE_SECOND = 1000;

function createListrOptions(options) {
  if (options.useVerboseRenderer) {
    return {
      renderer: _listrVerboseRenderer2.default
    };
  }
  return {
    renderer: _listrUpdateRenderer2.default,
    collapse: false
  };
}

exports.default = (() => {
  var _ref = _asyncToGenerator(function* (params) {
    const log = [];
    let options = (0, _parseOptions2.default)(params, false);
    // Setup AWS S3 client
    const bucket = options.awsBucket;
    const dataDir = `${options.environmentId}/${options.folderName}`;

    _awsSdk2.default.config.update({
      accessKeyId: options.awsAccessKey,
      secretAccessKey: options.awsSecret
    });

    const s3Client = new _awsSdk2.default.S3({
      region: options.awsRegion || 'ap-southeast-2'
    });

    // get the exported data on S3
    params.content = yield (0, _assets.getFileFromAWS)(s3Client, '//export.json', bucket, dataDir, true);
    options = (0, _parseOptions2.default)(params, true);
    const listrOptions = createListrOptions(options);
    const requestQueue = new _pQueue2.default({
      interval: ONE_SECOND,
      intervalCap: options.rateLimit,
      carryoverConcurrencyCount: true
    });

    // Setup custom log listener to store log messages for later
    (0, _logging.setupLogging)(log);

    const infoTable = new _cliTable2.default();

    infoTable.push([{ colSpan: 2, content: 'The following entities are going to be imported:' }]);

    Object.keys(options.content).forEach(function (type) {
      if (options.skipLocales && type === 'locales') {
        return;
      }

      if (options.skipContentModel && ['contentTypes', 'editorInterfaces'].indexOf(type) >= 0) {
        return;
      }

      if (options.contentModelOnly && !(['contentTypes', 'editorInterfaces', 'locales'].indexOf(type) >= 0)) {
        return;
      }

      infoTable.push([(0, _lodash.startCase)(type), options.content[type].length]);
    });

    console.log(infoTable.toString());

    const tasks = new _listr2.default([{
      title: 'Validating content-file',
      task: function task(ctx) {
        (0, _validations.assertPayload)(options.content);
      }
    }, {
      title: 'Initialize client',
      task: (0, _listr3.wrapTask)((() => {
        var _ref2 = _asyncToGenerator(function* (ctx) {
          ctx.client = (0, _initClient2.default)(options);
        });

        return function (_x2) {
          return _ref2.apply(this, arguments);
        };
      })())
    }, {
      title: 'Checking if destination space already has any content and retrieving it',
      task: (0, _listr3.wrapTask)((() => {
        var _ref3 = _asyncToGenerator(function* (ctx, task) {
          const destinationData = yield (0, _getDestinationData2.default)({
            client: ctx.client,
            spaceId: options.spaceId,
            environmentId: options.environmentId,
            sourceData: options.content,
            skipLocales: options.skipLocales,
            skipContentModel: options.skipContentModel,
            requestQueue
          });

          ctx.sourceDataUntransformed = options.content;
          ctx.destinationData = destinationData;
          (0, _validations.assertDefaultLocale)(ctx.sourceDataUntransformed, ctx.destinationData);
        });

        return function (_x3, _x4) {
          return _ref3.apply(this, arguments);
        };
      })())
    }, {
      title: 'Apply transformations to source data',
      task: (0, _listr3.wrapTask)((() => {
        var _ref4 = _asyncToGenerator(function* (ctx) {
          const transformedSourceData = (0, _transformSpace2.default)(ctx.sourceDataUntransformed, ctx.destinationData);
          ctx.sourceData = transformedSourceData;
        });

        return function (_x5) {
          return _ref4.apply(this, arguments);
        };
      })())
    }, {
      title: 'Push content to destination space',
      task: function task(ctx, _task) {
        return (0, _pushToSpace2.default)({
          sourceData: ctx.sourceData,
          destinationData: ctx.destinationData,
          client: ctx.client,
          spaceId: options.spaceId,
          environmentId: options.environmentId,
          contentModelOnly: options.contentModelOnly,
          skipLocales: options.skipLocales,
          skipContentModel: options.skipContentModel,
          skipContentPublishing: options.skipContentPublishing,
          timeout: options.timeout,
          retryLimit: options.retryLimit,
          uploadAssets: options.uploadAssets,
          dataDir,
          bucket,
          assetsDirectory: options.assetsDirectory,
          listrOptions,
          requestQueue,
          s3Client
        });
      }
    }], listrOptions);

    return tasks.run({
      data: {}
    }).then(function (ctx) {
      console.log('Finished importing all data');

      const resultTypes = Object.keys(ctx.data);
      if (resultTypes.length) {
        const resultTable = new _cliTable2.default();

        resultTable.push([{ colSpan: 2, content: 'Imported entities' }]);

        resultTypes.forEach(function (type) {
          resultTable.push([(0, _lodash.startCase)(type), ctx.data[type].length]);
        });

        console.log(resultTable.toString());
      } else {
        console.log('No data was imported');
      }

      const durationHuman = options.startTime.fromNow(true);
      const durationSeconds = (0, _moment2.default)().diff(options.startTime, 'seconds');

      console.log(`The import took ${durationHuman} (${durationSeconds}s)`);

      return ctx.data;
    }).catch(function (err) {
      log.push({
        ts: new Date().toJSON(),
        level: 'error',
        error: err
      });
    }).then(function (data) {
      const errorLog = log.filter(function (logMessage) {
        return logMessage.level !== 'info' && logMessage.level !== 'warning';
      });
      const displayLog = log.filter(function (logMessage) {
        return logMessage.level !== 'info';
      });
      (0, _logging.displayErrorLog)(displayLog);

      if (errorLog.length) {
        return (0, _logging.writeErrorLogFile)(options.errorLogFile, errorLog).then(function () {
          const multiError = new Error('Errors occurred');
          multiError.name = 'ContentfulMultiError';
          multiError.errors = errorLog;
          throw multiError;
        });
      }

      console.log('The import was successful.');

      return data;
    });
  });

  function runContentfulImport(_x) {
    return _ref.apply(this, arguments);
  }

  return runContentfulImport;
})();

module.exports = exports.default;