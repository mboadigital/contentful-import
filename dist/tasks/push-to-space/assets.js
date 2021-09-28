'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processAssets = exports.getFileStreamFromAWS = exports.getAssetStreamForURL = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

let getAssetStreamForURL = exports.getAssetStreamForURL = (() => {
  var _ref = _asyncToGenerator(function* (url, assetsDirectory) {
    var _url$split = url.split('//'),
        _url$split2 = _slicedToArray(_url$split, 2);

    const assetPath = _url$split2[1];

    const filePath = (0, _path.join)(assetsDirectory, assetPath);
    try {
      yield stat(filePath);
      return _fs2.default.createReadStream(filePath);
    } catch (err) {
      const error = new Error('Cannot open asset from filesystem');
      error.filePath = filePath;
      throw error;
    }
  });

  return function getAssetStreamForURL(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

let getFileStreamFromAWS = exports.getFileStreamFromAWS = (() => {
  var _ref2 = _asyncToGenerator(function* (s3Client, url, bucketName, path) {
    var _url$split5 = url.split('//'),
        _url$split6 = _slicedToArray(_url$split5, 2);

    const assetPath = _url$split6[1];

    const key = path + '/' + assetPath;
    const params = {
      Bucket: bucketName,
      Key: key
    };
    return s3Client.getObject(params).createReadStream();
  });

  return function getFileStreamFromAWS(_x3, _x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
})();

let processAssets = exports.processAssets = (() => {
  var _ref3 = _asyncToGenerator(function* ({ assets, timeout, retryLimit, requestQueue }) {
    const pendingProcessingAssets = assets.map(function (asset) {
      return requestQueue.add(_asyncToGenerator(function* () {
        _logging.logEmitter.emit('info', `Processing Asset ${(0, _getEntityName2.default)(asset)}`);
        const processingOptions = Object.assign({}, timeout && { processingCheckWait: timeout }, retryLimit && { processingCheckRetry: retryLimit });

        try {
          const processedAsset = yield asset.processForAllLocales(processingOptions);
          return processedAsset;
        } catch (err) {
          err.entity = asset;
          _logging.logEmitter.emit('error', err);
          return null;
        }
      }));
    });

    const potentiallyProcessedAssets = yield Promise.all(pendingProcessingAssets);

    return potentiallyProcessedAssets.filter(function (asset) {
      return asset;
    });
  });

  return function processAssets(_x7) {
    return _ref3.apply(this, arguments);
  };
})();

exports.getFileFromAWS = getFileFromAWS;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _util = require('util');

var _getEntityName = require('contentful-batch-libs/dist/get-entity-name');

var _getEntityName2 = _interopRequireDefault(_getEntityName);

var _logging = require('contentful-batch-libs/dist/logging');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const stat = (0, _util.promisify)(_fs2.default.stat);

function getFileFromAWS(s3Client, url, bucketName, path, toJson) {
  return new Promise((resolve, reject) => {
    var _url$split3 = url.split('//'),
        _url$split4 = _slicedToArray(_url$split3, 2);

    const assetPath = _url$split4[1];

    const key = path + '/' + assetPath;
    const params = {
      Bucket: bucketName,
      Key: key
    };
    s3Client.getObject(params, (err, data) => {
      if (err) {
        reject(err);
      }
      if (toJson) {
        const buffer = data && data.Body ? data.Body.toString() : null;
        const json = buffer ? JSON.parse(buffer) : null;
        resolve(json);
      }
      const result = data ? data.Body : null;
      resolve(result);
    });
  });
}