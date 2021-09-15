'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

let batchedIdQuery = (() => {
  var _ref = _asyncToGenerator(function* ({ environment, type, ids, requestQueue }) {
    const method = METHODS[type].method;
    const entityTypeName = METHODS[type].name;
    const batches = getIdBatches(ids);

    let totalFetched = 0;

    const allPendingResponses = batches.map(function (idBatch) {
      return requestQueue.add(_asyncToGenerator(function* () {
        const response = yield environment[method]({
          'sys.id[in]': idBatch,
          limit: idBatch.split(',').length
        });
        totalFetched = totalFetched + response.items.length;
        _logging.logEmitter.emit('info', `Fetched ${totalFetched} of ${response.total} ${entityTypeName}`);

        return response.items;
      }));
    });

    const responses = yield _bluebird2.default.all(allPendingResponses);

    return responses.flat();
  });

  return function batchedIdQuery(_x) {
    return _ref.apply(this, arguments);
  };
})();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _logging = require('contentful-batch-libs/dist/logging');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const BATCH_CHAR_LIMIT = 1990;
const BATCH_SIZE_LIMIT = 100;

const METHODS = {
  contentTypes: { name: 'content types', method: 'getContentTypes' },
  locales: { name: 'locales', method: 'getLocales' },
  entries: { name: 'entries', method: 'getEntries' },
  assets: { name: 'assets', method: 'getAssets' }
};

function getIdBatches(ids) {
  const batches = [];
  let currentBatch = '';
  let currentSize = 0;
  while (ids.length > 0) {
    const id = ids.splice(0, 1);
    currentBatch += id;
    currentSize = currentSize + 1;
    if (currentSize === BATCH_SIZE_LIMIT || currentBatch.length > BATCH_CHAR_LIMIT || ids.length === 0) {
      batches.push(currentBatch);
      currentBatch = '';
      currentSize = 0;
    } else {
      currentBatch += ',';
    }
  }
  return batches;
}

/**
 * Gets content from a space which will have content copied to it, based on a
 * collection of existing content.
 *
 * Only the supplied entry/asset/contentType/locale IDs will be retrieved.
 * All tags will be retrieved.
 *
 */

exports.default = (() => {
  var _ref3 = _asyncToGenerator(function* ({
    client,
    spaceId,
    environmentId,
    sourceData,
    contentModelOnly,
    skipLocales,
    skipContentModel,
    requestQueue
  }) {
    const space = yield client.getSpace(spaceId);
    const environment = yield space.getEnvironment(environmentId);
    const result = {
      contentTypes: [],
      tags: [],
      locales: [],
      entries: [],
      assets: []

      // Make sure all required properties are available and at least an empty array
    };sourceData = _extends({}, result, sourceData);

    if (!skipContentModel) {
      const contentTypeIds = sourceData.contentTypes.map(function (e) {
        return e.sys.id;
      });
      result.contentTypes = batchedIdQuery({
        environment,
        type: 'contentTypes',
        ids: contentTypeIds,
        requestQueue
      });

      if (!skipLocales) {
        const localeIds = sourceData.locales.map(function (e) {
          return e.sys.id;
        });
        result.locales = batchedIdQuery({
          environment,
          type: 'locales',
          ids: localeIds,
          requestQueue
        });
      }
    }

    // include tags even if contentModelOnly = true
    result.tags = environment.getTags().then(function (response) {
      return response.items;
    }).catch(function (e) {
      // users without access to Tags will get 404
      // if they dont have access, remove tags array so they're not handled in future steps
      delete result.tags;
    });

    if (contentModelOnly) {
      return _bluebird2.default.props(result);
    }

    const entryIds = sourceData.entries.map(function (e) {
      return e.sys.id;
    });
    const assetIds = sourceData.assets.map(function (e) {
      return e.sys.id;
    });
    result.entries = batchedIdQuery({
      environment,
      type: 'entries',
      ids: entryIds,
      requestQueue
    });
    result.assets = batchedIdQuery({
      environment,
      type: 'assets',
      ids: assetIds,
      requestQueue
    });
    result.webhooks = [];

    return _bluebird2.default.props(result);
  });

  function getDestinationData(_x2) {
    return _ref3.apply(this, arguments);
  }

  return getDestinationData;
})();

module.exports = exports.default;