'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sortEntries;

var _collection = require('lodash/collection');

var _object = require('lodash/object');

var _o = _interopRequireWildcard(_object);

var _array = require('lodash/array');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Given a list of entries, this function reorders them so that entries which
 * are linked from other entries always come first in the order. This ensures
 * that when we publish entries, we are not publishing entries which contain
 * links to other entries which haven't been published yet.
 */
function sortEntries(entries) {
  const linkedEntries = getLinkedEntries(entries);

  const mergedLinkedEntries = mergeSort(linkedEntries, a => {
    return hasLinkedIndexesInFront(a);
  });

  return (0, _collection.map)(mergedLinkedEntries, linkInfo => entries[linkInfo.index]);

  function hasLinkedIndexesInFront(item) {
    if (hasLinkedIndexes(item)) {
      return (0, _collection.some)(item.linkIndexes, index => index > item.index) ? 1 : -1;
    }
    return 0;
  }

  function hasLinkedIndexes(item) {
    return item.linkIndexes.length > 0;
  }
}

function getLinkedEntries(entries) {
  return (0, _collection.map)(entries, function (entry) {
    const entryIndex = entries.indexOf(entry);

    const rawLinks = (0, _collection.map)(entry.fields, field => {
      field = _o.values(field)[0];
      if (isEntryLink(field)) {
        return getFieldEntriesIndex(field, entries);
      } else if (isEntityArray(field) && isEntryLink(field[0])) {
        return (0, _collection.map)(field, item => getFieldEntriesIndex(item, entries));
      }
    });

    return {
      index: entryIndex,
      linkIndexes: (0, _collection.filter)((0, _array.flatten)(rawLinks), index => index >= 0)
    };
  });
}

function getFieldEntriesIndex(field, entries) {
  const id = _o.get(field, 'sys.id');
  return entries.findIndex(entry => entry.sys.id === id);
}

function isEntryLink(item) {
  return _o.get(item, 'sys.type') === 'Entry' || _o.get(item, 'sys.linkType') === 'Entry';
}

function isEntityArray(item) {
  return Array.isArray(item) && item.length > 0 && _o.has(item[0], 'sys');
}

/**
 * From https://github.com/millermedeiros/amd-utils/blob/master/src/array/sort.js
 * MIT Licensed
 * Merge sort (http://en.wikipedia.org/wiki/Merge_sort)
 * @version 0.1.0 (2012/05/23)
 */
function mergeSort(arr, compareFn) {
  if (arr.length < 2) return arr;

  if (compareFn == null) compareFn = defaultCompare;

  const mid = ~~(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compareFn);
  const right = mergeSort(arr.slice(mid, arr.length), compareFn);

  return merge(left, right, compareFn);
}

function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function merge(left, right, compareFn) {
  const result = [];

  while (left.length && right.length) {
    if (compareFn(left[0], right[0]) <= 0) {
      // if 0 it should preserve same order (stable)
      result.push(left.shift());
    } else {
      result.push(right.shift());
    }
  }

  if (left.length) result.push.apply(result, left);
  if (right.length) result.push.apply(result, right);

  return result;
}
module.exports = exports.default;