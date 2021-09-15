'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = pushToSpace;

var _listr = require('listr');

var _listr2 = _interopRequireDefault(_listr);

var _listrVerboseRenderer = require('listr-verbose-renderer');

var _listrVerboseRenderer2 = _interopRequireDefault(_listrVerboseRenderer);

var _logging = require('contentful-batch-libs/dist/logging');

var _listr3 = require('contentful-batch-libs/dist/listr');

var _assets = require('./assets');

var assets = _interopRequireWildcard(_assets);

var _creation = require('./creation');

var creation = _interopRequireWildcard(_creation);

var _publishing = require('./publishing');

var publishing = _interopRequireWildcard(_publishing);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DEFAULT_CONTENT_STRUCTURE = {
  entries: [],
  assets: [],
  contentTypes: [],
  tags: [],
  locales: [],
  webhooks: [],
  editorInterfaces: []

  /**
   * Pushes all changes to a given space. Handles (un)publishing
   * as well as delays after creation and before publishing.
   *
   * Creates everything in the right order so that a content type for a given entry
   * is there when entry creation for that content type is attempted.
   *
   * Allows only content model or only content pushing.
   *
   * Options:
   * - sourceData: see DEFAULT_CONTENT_STRUCTURE
   * - destinationData: see DEFAULT_CONTENT_STRUCTURE
   * - client: preconfigured management API client
   * - spaceId: ID of space content is being copied to
   * - contentModelOnly: synchronizes only content types and locales
   * - skipLocales: skips locales when synchronizing the content model
   * - skipContentModel: synchronizes only entries and assets
   * - skipContentPublishing: create content but don't publish it
   * - uploadAssets: upload exported files instead of pointing to an existing URL
   * - assetsDirectory: path to exported asset files to be uploaded instead of pointing to an existing URL
   */

};function pushToSpace({
  sourceData,
  destinationData = {},
  client,
  spaceId,
  environmentId,
  contentModelOnly,
  skipContentModel,
  skipLocales,
  skipContentPublishing,
  timeout,
  retryLimit,
  listrOptions,
  uploadAssets,
  dataDir,
  bucket,
  assetsDirectory,
  requestQueue,
  s3Client
}) {
  sourceData = _extends({}, DEFAULT_CONTENT_STRUCTURE, sourceData);
  destinationData = _extends({}, DEFAULT_CONTENT_STRUCTURE, destinationData);

  listrOptions = listrOptions || {
    renderer: _listrVerboseRenderer2.default
  };

  const destinationDataById = {};

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.entries(destinationData)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      const _ref = _step.value;

      var _ref2 = _slicedToArray(_ref, 2);

      const entityType = _ref2[0];
      const entities = _ref2[1];

      const entitiesById = new Map();

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = entities[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          const entity = _step4.value;

          entitiesById.set(entity.sys.id, entity);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      destinationDataById[entityType] = entitiesById;
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

  return new _listr2.default([{
    title: 'Connecting to space',
    task: (0, _listr3.wrapTask)((() => {
      var _ref3 = _asyncToGenerator(function* (ctx, task) {
        const space = yield client.getSpace(spaceId);
        const environment = yield space.getEnvironment(environmentId);

        ctx.space = space;
        ctx.environment = environment;
      });

      return function (_x, _x2) {
        return _ref3.apply(this, arguments);
      };
    })())
  }, {
    title: 'Importing Locales',
    task: (0, _listr3.wrapTask)((() => {
      var _ref4 = _asyncToGenerator(function* (ctx, task) {
        const locales = yield creation.createLocales({
          context: { target: ctx.environment, type: 'Locale' },
          entities: sourceData.locales,
          destinationEntitiesById: destinationDataById.locales,
          requestQueue
        });

        ctx.data.locales = locales;
      });

      return function (_x3, _x4) {
        return _ref4.apply(this, arguments);
      };
    })()),
    skip: () => skipContentModel || skipLocales
  }, {
    title: 'Importing Content Types',
    task: (0, _listr3.wrapTask)((() => {
      var _ref5 = _asyncToGenerator(function* (ctx, task) {
        const contentTypes = yield creation.createEntities({
          context: { target: ctx.environment, type: 'ContentType' },
          entities: sourceData.contentTypes,
          destinationEntitiesById: destinationDataById.contentTypes,
          requestQueue
        });

        ctx.data.contentTypes = contentTypes;
      });

      return function (_x5, _x6) {
        return _ref5.apply(this, arguments);
      };
    })()),
    skip: () => skipContentModel
  }, {
    title: 'Publishing Content Types',
    task: (0, _listr3.wrapTask)((() => {
      var _ref6 = _asyncToGenerator(function* (ctx, task) {
        const publishedContentTypes = yield publishEntities({
          entities: ctx.data.contentTypes,
          sourceEntities: sourceData.contentTypes,
          requestQueue
        });
        ctx.data.contentTypes = publishedContentTypes;
      });

      return function (_x7, _x8) {
        return _ref6.apply(this, arguments);
      };
    })()),
    skip: ctx => skipContentModel
  }, {
    title: 'Importing Tags',
    task: (0, _listr3.wrapTask)((() => {
      var _ref7 = _asyncToGenerator(function* (ctx, task) {
        const tags = yield creation.createEntities({
          context: { target: ctx.environment, type: 'Tag' },
          entities: sourceData.tags,
          destinationEntitiesById: destinationDataById.tags,
          requestQueue
        });
        ctx.data.tags = tags;
      });

      return function (_x9, _x10) {
        return _ref7.apply(this, arguments);
      };
    })()),
    // we remove `tags` from destination data if an error was thrown trying to access them
    // this means the user doesn't have access to this feature, skip importing tags
    skip: () => !destinationDataById.tags
  }, {
    title: 'Importing Editor Interfaces',
    task: (0, _listr3.wrapTask)((() => {
      var _ref8 = _asyncToGenerator(function* (ctx, task) {
        const allEditorInterfacesBeingFetched = ctx.data.contentTypes.map((() => {
          var _ref9 = _asyncToGenerator(function* (contentType) {
            const editorInterface = sourceData.editorInterfaces.find(function (editorInterface) {
              return editorInterface.sys.contentType.sys.id === contentType.sys.id;
            });

            if (!editorInterface) {
              return;
            }

            try {
              const ctEditorInterface = yield requestQueue.add(function () {
                return ctx.environment.getEditorInterfaceForContentType(contentType.sys.id);
              });
              _logging.logEmitter.emit('info', `Fetched editor interface for ${contentType.name}`);
              ctEditorInterface.controls = editorInterface.controls;
              ctEditorInterface.groupControls = editorInterface.groupControls;
              ctEditorInterface.editorLayout = editorInterface.editorLayout;

              const updatedEditorInterface = yield requestQueue.add(function () {
                return ctEditorInterface.update();
              });
              return updatedEditorInterface;
            } catch (err) {
              err.entity = editorInterface;
              throw err;
            }
          });

          return function (_x13) {
            return _ref9.apply(this, arguments);
          };
        })());

        const allEditorInterfaces = yield Promise.all(allEditorInterfacesBeingFetched);
        const editorInterfaces = allEditorInterfaces.filter(function (editorInterface) {
          return editorInterface;
        });

        ctx.data.editorInterfaces = editorInterfaces;
      });

      return function (_x11, _x12) {
        return _ref8.apply(this, arguments);
      };
    })()),
    skip: ctx => skipContentModel || ctx.data.contentTypes.length === 0
  }, {
    title: 'Uploading Assets',
    task: (0, _listr3.wrapTask)((() => {
      var _ref10 = _asyncToGenerator(function* (ctx, task) {
        const allPendingUploads = [];

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = sourceData.assets[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            const asset = _step2.value;
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = Object.values(asset.transformed.fields.file)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                const file = _step3.value;

                allPendingUploads.push(requestQueue.add(_asyncToGenerator(function* () {
                  try {
                    _logging.logEmitter.emit('info', `Uploading Asset file ${file.upload}`);
                    const assetDirectory = dataDir + '/assets';
                    const assetStream = yield assets.getFileStreamFromAWS(s3Client, file.upload, bucket, assetDirectory);
                    // const assetStream = await assets.getAssetStreamForURL(file.upload, assetsDirectory)
                    const upload = yield ctx.environment.createUpload({
                      fileName: asset.transformed.sys.id,
                      file: assetStream
                    });

                    delete file.upload;

                    file.uploadFrom = {
                      sys: {
                        type: 'Link',
                        linkType: 'Upload',
                        id: upload.sys.id
                      }
                    };

                    return upload;
                  } catch (err) {
                    _logging.logEmitter.emit('error', err);
                  }
                })));
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }
          }

          // We call the pending uploads for the side effects
          // so we can just await all pending ones that are queued
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        const uploads = yield Promise.all(allPendingUploads);

        ctx.data.uploadedAssetFiles = uploads;
      });

      return function (_x14, _x15) {
        return _ref10.apply(this, arguments);
      };
    })()),
    skip: ctx => !uploadAssets || !sourceData.assets.length
  }, {
    title: 'Importing Assets',
    task: (0, _listr3.wrapTask)((() => {
      var _ref12 = _asyncToGenerator(function* (ctx, task) {
        const assetsToProcess = yield creation.createEntities({
          context: { target: ctx.environment, type: 'Asset' },
          entities: sourceData.assets,
          destinationEntitiesById: destinationDataById.assets,
          requestQueue
        });

        const processedAssets = yield assets.processAssets({
          assets: assetsToProcess,
          timeout,
          retryLimit,
          requestQueue
        });
        ctx.data.assets = processedAssets;
      });

      return function (_x16, _x17) {
        return _ref12.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly
  }, {
    title: 'Publishing Assets',
    task: (0, _listr3.wrapTask)((() => {
      var _ref13 = _asyncToGenerator(function* (ctx, task) {
        const publishedAssets = yield publishEntities({
          entities: ctx.data.assets,
          sourceEntities: sourceData.assets,
          requestQueue
        });
        ctx.data.publishedAssets = publishedAssets;
      });

      return function (_x18, _x19) {
        return _ref13.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly || skipContentPublishing
  }, {
    title: 'Archiving Assets',
    task: (0, _listr3.wrapTask)((() => {
      var _ref14 = _asyncToGenerator(function* (ctx, task) {
        const archivedAssets = yield archiveEntities({
          entities: ctx.data.assets,
          sourceEntities: sourceData.assets,
          requestQueue
        });
        ctx.data.archivedAssets = archivedAssets;
      });

      return function (_x20, _x21) {
        return _ref14.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly || skipContentPublishing
  }, {
    title: 'Importing Content Entries',
    task: (0, _listr3.wrapTask)((() => {
      var _ref15 = _asyncToGenerator(function* (ctx, task) {
        const entries = yield creation.createEntries({
          context: { target: ctx.environment, skipContentModel },
          entities: sourceData.entries,
          destinationEntitiesById: destinationDataById.entries,
          requestQueue
        });
        ctx.data.entries = entries;
      });

      return function (_x22, _x23) {
        return _ref15.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly
  }, {
    title: 'Publishing Content Entries',
    task: (0, _listr3.wrapTask)((() => {
      var _ref16 = _asyncToGenerator(function* (ctx, task) {
        const publishedEntries = yield publishEntities({
          entities: ctx.data.entries,
          sourceEntities: sourceData.entries,
          requestQueue
        });
        ctx.data.publishedEntries = publishedEntries;
      });

      return function (_x24, _x25) {
        return _ref16.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly || skipContentPublishing
  }, {
    title: 'Archiving Entries',
    task: (0, _listr3.wrapTask)((() => {
      var _ref17 = _asyncToGenerator(function* (ctx, task) {
        const archivedEntries = yield archiveEntities({
          entities: ctx.data.entries,
          sourceEntities: sourceData.entries,
          requestQueue
        });
        ctx.data.archivedEntries = archivedEntries;
      });

      return function (_x26, _x27) {
        return _ref17.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly || skipContentPublishing
  }, {
    title: 'Creating Web Hooks',
    task: (0, _listr3.wrapTask)((() => {
      var _ref18 = _asyncToGenerator(function* (ctx, task) {
        const webhooks = yield creation.createEntities({
          context: { target: ctx.space, type: 'Webhook' },
          entities: sourceData.webhooks,
          destinationEntitiesById: destinationDataById.webhooks,
          requestQueue
        });
        ctx.data.webhooks = webhooks;
      });

      return function (_x28, _x29) {
        return _ref18.apply(this, arguments);
      };
    })()),
    skip: ctx => contentModelOnly || environmentId !== 'master' && 'Webhooks can only be imported in master environment'
  }], listrOptions);
}

function archiveEntities({ entities, sourceEntities, requestQueue }) {
  const entityIdsToArchive = sourceEntities.filter(({ original }) => original.sys.archivedVersion).map(({ original }) => original.sys.id);

  const entitiesToArchive = entities.filter(entity => entityIdsToArchive.indexOf(entity.sys.id) !== -1);

  return publishing.archiveEntities({ entities: entitiesToArchive, requestQueue });
}

function publishEntities({ entities, sourceEntities, requestQueue }) {
  // Find all entities in source content which are published
  const entityIdsToPublish = sourceEntities.filter(({ original }) => original.sys.publishedVersion).map(({ original }) => original.sys.id);

  // Filter imported entities and publish only these who got published in the source
  const entitiesToPublish = entities.filter(entity => entityIdsToPublish.indexOf(entity.sys.id) !== -1);

  return publishing.publishEntities({ entities: entitiesToPublish, requestQueue });
}
module.exports = exports.default;