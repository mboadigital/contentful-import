'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createEntries = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

let createEntitiesWithConcurrency = (() => {
  var _ref = _asyncToGenerator(function* ({ context, entities, destinationEntitiesById, requestQueue }) {
    const pendingCreatedEntities = entities.map(function (entity) {
      const destinationEntity = getDestinationEntityForSourceEntity(destinationEntitiesById, entity.transformed);
      const operation = destinationEntity ? 'update' : 'create';

      return requestQueue.add(_asyncToGenerator(function* () {
        try {
          const createdEntity = yield destinationEntity ? updateDestinationWithSourceData(destinationEntity, entity.transformed) : createInDestination(context, entity.transformed);

          creationSuccessNotifier(operation, createdEntity);

          return createdEntity;
        } catch (err) {
          return handleCreationErrors(entity, err);
        }
      }));
    });

    const createdEntities = yield Promise.all(pendingCreatedEntities);

    // Filter null values in case of errors
    return createdEntities.filter(function (entity) {
      return entity;
    });
  });

  return function createEntitiesWithConcurrency(_x) {
    return _ref.apply(this, arguments);
  };
})();

let createEntitiesInSequence = (() => {
  var _ref3 = _asyncToGenerator(function* ({ context, entities, destinationEntitiesById, requestQueue }) {
    const createdEntities = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = entities[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const entity = _step.value;

        const destinationEntity = getDestinationEntityForSourceEntity(destinationEntitiesById, entity.transformed);
        const operation = destinationEntity ? 'update' : 'create';

        try {
          // Even though we run things in sequence here,
          // we still want to go through the normal rate limiting queue
          const createdEntity = yield requestQueue.add(_asyncToGenerator(function* () {
            const createdOrUpdatedEntity = yield destinationEntity ? updateDestinationWithSourceData(destinationEntity, entity.transformed) : createInDestination(context, entity.transformed);
            return createdOrUpdatedEntity;
          }));

          creationSuccessNotifier(operation, createdEntity);

          createdEntities.push(createdEntity);
        } catch (err) {
          const maybeSubstituteEntity = handleCreationErrors(entity, err);
          if (maybeSubstituteEntity) {
            createdEntities.push(maybeSubstituteEntity);
          }
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

    return createdEntities;
  });

  return function createEntitiesInSequence(_x2) {
    return _ref3.apply(this, arguments);
  };
})();

/**
 * Creates a list of entries
 */


let createEntries = exports.createEntries = (() => {
  var _ref5 = _asyncToGenerator(function* ({ context, entities, destinationEntitiesById, requestQueue }) {
    const createdEntries = yield Promise.all(entities.map(function (entry) {
      return createEntry({ entry, target: context.target, skipContentModel: context.skipContentModel, destinationEntitiesById, requestQueue });
    }));

    return createdEntries.filter(function (entry) {
      return entry;
    });
  });

  return function createEntries(_x3) {
    return _ref5.apply(this, arguments);
  };
})();

let createEntry = (() => {
  var _ref6 = _asyncToGenerator(function* ({ entry, target, skipContentModel, destinationEntitiesById, requestQueue }) {
    const contentTypeId = entry.original.sys.contentType.sys.id;
    const destinationEntry = getDestinationEntityForSourceEntity(destinationEntitiesById, entry.transformed);
    const operation = destinationEntry ? 'update' : 'create';
    try {
      const createdOrUpdatedEntry = yield requestQueue.add(function () {
        return destinationEntry ? updateDestinationWithSourceData(destinationEntry, entry.transformed) : createEntryInDestination(target, contentTypeId, entry.transformed);
      });

      creationSuccessNotifier(operation, createdOrUpdatedEntry);

      return createdOrUpdatedEntry;
    } catch (err) {
      /* If a field doesn't exist, it means it has been removed from the content types
       * In that case, the field is removed from the entry, and creation is attempted again.
      */
      if (skipContentModel && err.name === 'UnknownField') {
        const errors = (0, _object.get)(JSON.parse(err.message), 'details.errors');
        entry.transformed.fields = cleanupUnknownFields(entry.transformed.fields, errors);
        return createEntry({ entry, target, skipContentModel, destinationEntitiesById, requestQueue });
      }
      err.entity = entry;
      _logging.logEmitter.emit('error', err);

      // No need to pass this entry down to publishing if it wasn't created
      return null;
    }
  });

  return function createEntry(_x4) {
    return _ref6.apply(this, arguments);
  };
})();

exports.createEntities = createEntities;
exports.createLocales = createLocales;

var _collection = require('lodash/collection');

var _object = require('lodash/object');

var _getEntityName = require('contentful-batch-libs/dist/get-entity-name');

var _getEntityName2 = _interopRequireDefault(_getEntityName);

var _logging = require('contentful-batch-libs/dist/logging');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Creates a list of entities
 * Applies to all entities except Entries, as the CMA API for those is slightly different
 * See handleCreationErrors for details on what errors reject the promise or not.
 */
function createEntities({ context, entities, destinationEntitiesById, requestQueue }) {
  return createEntitiesWithConcurrency({ context, entities, destinationEntitiesById, requestQueue });
}

// TODO
// Locales need to be created in series
function createLocales({ context, entities, destinationEntitiesById, requestQueue }) {
  return createEntitiesInSequence({ context, entities, destinationEntitiesById, requestQueue });
}

function updateDestinationWithSourceData(destinationEntity, sourceEntity) {
  const plainData = getPlainData(sourceEntity);
  (0, _object.assign)(destinationEntity, plainData);
  return destinationEntity.update();
}

function createInDestination(context, sourceEntity) {
  const type = context.type,
        target = context.target;

  if (type === 'Tag') {
    // tags are created with a different signature
    return createTagInDestination(context, sourceEntity);
  }

  const id = (0, _object.get)(sourceEntity, 'sys.id');
  const plainData = getPlainData(sourceEntity);

  return id ? target[`create${type}WithId`](id, plainData) : target[`create${type}`](plainData);
}

function createEntryInDestination(space, contentTypeId, sourceEntity) {
  const id = sourceEntity.sys.id;
  const plainData = getPlainData(sourceEntity);
  return id ? space.createEntryWithId(contentTypeId, id, plainData) : space.createEntry(contentTypeId, plainData);
}

function createTagInDestination(context, sourceEntity) {
  const id = sourceEntity.sys.id;
  const visibility = sourceEntity.sys.visibility || 'private';
  const name = sourceEntity.name;
  return context.target.createTag(id, name, visibility);
}

/**
 * Handles entity creation errors.
 * If the error is a VersionMismatch the error is thrown and a message is returned
 * instructing the user on what this situation probably means.
 */
function handleCreationErrors(entity, err) {
  // Handle the case where a locale already exists and skip it
  if ((0, _object.get)(err, 'error.sys.id') === 'ValidationFailed') {
    const errors = (0, _object.get)(err, 'error.details.errors');
    if (errors && errors.length > 0 && errors[0].name === 'taken') {
      return entity;
    }
  }
  err.entity = entity.original;
  _logging.logEmitter.emit('error', err);

  // No need to pass this entity down to publishing if it wasn't created
  return null;
}

function cleanupUnknownFields(fields, errors) {
  return (0, _object.omitBy)(fields, (field, fieldId) => {
    return (0, _collection.find)(errors, error => {
      var _error$path = _slicedToArray(error.path, 2);

      const errorFieldId = _error$path[1];

      return error.name === 'unknown' && errorFieldId === fieldId;
    });
  });
}

function getDestinationEntityForSourceEntity(destinationEntitiesById, sourceEntity) {
  return destinationEntitiesById.get((0, _object.get)(sourceEntity, 'sys.id')) || null;
}

function creationSuccessNotifier(method, createdEntity) {
  const verb = method[0].toUpperCase() + method.substr(1, method.length) + 'd';
  _logging.logEmitter.emit('info', `${verb} ${createdEntity.sys.type} ${(0, _getEntityName2.default)(createdEntity)}`);
  return createdEntity;
}

function getPlainData(entity) {
  const data = entity.toPlainObject ? entity.toPlainObject() : entity;
  return (0, _object.omit)(data, 'sys');
}