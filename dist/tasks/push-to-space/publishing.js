'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.archiveEntities = exports.publishEntities = undefined;

/**
 * Publish a list of entities.
 * Does not return a rejected promise in the case of an error, pushing it
 * to an error buffer instead.
 */
let publishEntities = exports.publishEntities = (() => {
  var _ref = _asyncToGenerator(function* ({ entities, requestQueue }) {
    const entitiesToPublish = entities.filter(function (entity) {
      if (!entity || !entity.publish) {
        _logging.logEmitter.emit('warning', `Unable to publish ${(0, _getEntityName2.default)(entity)}`);
        return false;
      }
      return true;
    });

    if (entitiesToPublish.length === 0) {
      _logging.logEmitter.emit('info', 'Skipping publishing since zero valid entities passed');
      return [];
    }

    const entity = entities[0].original || entities[0];
    const type = entity.sys.type || 'unknown type';
    _logging.logEmitter.emit('info', `Publishing ${entities.length} ${type}s`);

    const result = yield runQueue(entitiesToPublish, [], requestQueue);
    _logging.logEmitter.emit('info', `Successfully published ${result.length} ${type}s`);
    return result;
  });

  return function publishEntities(_x) {
    return _ref.apply(this, arguments);
  };
})();

let archiveEntities = exports.archiveEntities = (() => {
  var _ref2 = _asyncToGenerator(function* ({ entities, requestQueue }) {
    const entitiesToArchive = entities.filter(function (entity) {
      if (!entity || !entity.archive) {
        _logging.logEmitter.emit('warning', `Unable to archive ${(0, _getEntityName2.default)(entity)}`);
        return false;
      }
      return true;
    });

    if (entitiesToArchive.length === 0) {
      _logging.logEmitter.emit('info', 'Skipping archiving since zero valid entities passed');
      return [];
    }

    const entity = entities[0].original || entities[0];
    const type = entity.sys.type || 'unknown type';
    _logging.logEmitter.emit('info', `Archiving ${entities.length} ${type}s`);

    const pendingArchivedEntities = entitiesToArchive.map(function (entity) {
      return requestQueue.add(_asyncToGenerator(function* () {
        try {
          const archivedEntity = yield entity.archive();
          return archivedEntity;
        } catch (err) {
          err.entity = entity;
          _logging.logEmitter.emit('error', err);
          return null;
        }
      }));
    });

    const allPossiblyArchivedEntities = yield Promise.all(pendingArchivedEntities);
    const allArchivedEntities = allPossiblyArchivedEntities.filter(function (entity) {
      return entity;
    });

    _logging.logEmitter.emit('info', `Successfully archived ${allArchivedEntities.length} ${type}s`);

    return allArchivedEntities;
  });

  return function archiveEntities(_x2) {
    return _ref2.apply(this, arguments);
  };
})();

let runQueue = (() => {
  var _ref4 = _asyncToGenerator(function* (queue, result = [], requestQueue) {
    const publishedEntities = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = queue[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const entity = _step.value;

        _logging.logEmitter.emit('info', `Publishing ${entity.sys.type} ${(0, _getEntityName2.default)(entity)}`);
        try {
          const publishedEntity = yield requestQueue.add(function () {
            return entity.publish();
          });
          publishedEntities.push(publishedEntity);
        } catch (err) {
          err.entity = entity;
          _logging.logEmitter.emit('error', err);
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    result = [...result, ...publishedEntities];

    const publishedEntityIds = new Set(publishedEntities.map(function (entity) {
      return entity.sys.id;
    }));
    const unpublishedEntities = queue.filter(function (entity) {
      return !publishedEntityIds.has(entity.sys.id);
    });

    if (unpublishedEntities.length > 0) {
      if (queue.length === unpublishedEntities.length) {
        // Fail when queue could not publish at least one item
        const unpublishedEntityNames = unpublishedEntities.map(_getEntityName2.default).join(', ');
        _logging.logEmitter.emit('error', `Could not publish the following entities: ${unpublishedEntityNames}`);
      } else {
        // Rerun queue with unpublished entities
        return runQueue(unpublishedEntities, result, requestQueue);
      }
    }
    // Return only published entities + last result
    return result;
  });

  return function runQueue(_x3) {
    return _ref4.apply(this, arguments);
  };
})();

var _getEntityName = require('contentful-batch-libs/dist/get-entity-name');

var _getEntityName2 = _interopRequireDefault(_getEntityName);

var _logging = require('contentful-batch-libs/dist/logging');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }