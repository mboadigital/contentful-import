'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sourceData, destinationData, customTransformers, entities = spaceEntities) {
  const transformers = (0, _object.defaults)(customTransformers, defaultTransformers);
  const baseSpaceData = (0, _object.omit)(sourceData, ...entities);

  sourceData.locales = (0, _sortLocales2.default)(sourceData.locales);
  const tagsEnabled = !!destinationData.tags;

  return entities.reduce((transformedSpaceData, type) => {
    // tags don't contain links to other entities, don't need to be sorted
    const sortedEntities = type === 'tags' ? sourceData[type] : (0, _sortEntries2.default)(sourceData[type]);

    const transformedEntities = sortedEntities.map(entity => ({
      original: entity,
      transformed: transformers[type](entity, destinationData[type], tagsEnabled)
    }));
    transformedSpaceData[type] = transformedEntities;
    return transformedSpaceData;
  }, baseSpaceData);
};

var _object = require('lodash/object');

var _transformers = require('./transformers');

var defaultTransformers = _interopRequireWildcard(_transformers);

var _sortEntries = require('../utils/sort-entries');

var _sortEntries2 = _interopRequireDefault(_sortEntries);

var _sortLocales = require('../utils/sort-locales');

var _sortLocales2 = _interopRequireDefault(_sortLocales);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const spaceEntities = ['contentTypes', 'entries', 'assets', 'locales', 'webhooks', 'tags'];

/**
 * Run transformer methods on each item for each kind of entity, in case there
 * is a need to transform data when copying it to the destination space
 */
module.exports = exports.default;