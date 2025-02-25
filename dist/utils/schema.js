'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.payloadSchema = exports.assetSchema = exports.editorInterfaceSchema = exports.webhookSchema = exports.localeSchema = exports.tagSchema = exports.contentTypeSchema = exports.entrySchema = undefined;

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const entrySchema = {
  sys: _joi2.default.object(),
  fields: _joi2.default.object()
};

const tagSchema = {
  name: _joi2.default.string().required(),
  sys: _joi2.default.object()
};

const contentTypeSchema = {
  sys: _joi2.default.object(),
  fields: _joi2.default.array().required().items(_joi2.default.object().keys({
    id: _joi2.default.string().required(),
    name: _joi2.default.string().required(),
    type: _joi2.default.string().required().regex(/^Symbol|Text|Integer|Number|Date|Object|Boolean|Array|Link|Location$/),
    validations: _joi2.default.array(),
    disabled: _joi2.default.boolean(),
    omitted: _joi2.default.boolean(),
    required: _joi2.default.boolean(),
    localized: _joi2.default.boolean(),
    linkType: _joi2.default.string().when('type', { is: 'Link', then: _joi2.default.string().regex(/^Asset|Entry$/), otherwise: _joi2.default.forbidden() })
  }))
};

const assetSchema = {
  sys: _joi2.default.object(),
  fields: _joi2.default.object({
    file: _joi2.default.object().pattern(/.+/, _joi2.default.object({
      url: _joi2.default.string(), // to be required
      details: _joi2.default.object({
        size: _joi2.default.number(),
        image: _joi2.default.object({
          width: _joi2.default.number(),
          height: _joi2.default.number()
        })
      }),
      fileName: _joi2.default.string().required(),
      contentType: _joi2.default.string().required()
    }))
  }).required()
};
const editorInterfaceSchema = {
  sys: _joi2.default.object(),
  controls: _joi2.default.array().items([{ fieldId: _joi2.default.string(), widgetId: _joi2.default.string() }])
};
const localeSchema = {
  name: _joi2.default.string().required(),
  internal_code: _joi2.default.string(),
  code: _joi2.default.string().required(),
  fallbackCode: _joi2.default.string().allow([null]),
  default: _joi2.default.boolean(),
  contentManagementApi: _joi2.default.boolean(),
  contentDeliveryApi: _joi2.default.boolean(),
  optional: _joi2.default.boolean(),
  sys: _joi2.default.object()
};

const webhookSchema = {
  name: _joi2.default.string(),
  url: _joi2.default.string().replace(/{[^}{]+?}/g, 'x').regex(/^https?:\/\/[^ /}{][^ }{]*$/i).required(),
  topics: _joi2.default.array().required(),
  httpBasicUsername: _joi2.default.string().allow(['', null])

  /**
   * @returns normalized validation object. Don't use normalized output as payload
   */
};const payloadSchema = _joi2.default.object({
  entries: _joi2.default.array().items([entrySchema]),
  contentTypes: _joi2.default.array().items([contentTypeSchema]),
  tags: _joi2.default.array().items([tagSchema]),
  assets: _joi2.default.array().items([assetSchema]),
  locales: _joi2.default.array().items([localeSchema]),
  editorInterfaces: _joi2.default.array().items([editorInterfaceSchema]),
  webhooks: _joi2.default.array().items([webhookSchema])
});
exports.entrySchema = entrySchema;
exports.contentTypeSchema = contentTypeSchema;
exports.tagSchema = tagSchema;
exports.localeSchema = localeSchema;
exports.webhookSchema = webhookSchema;
exports.editorInterfaceSchema = editorInterfaceSchema;
exports.assetSchema = assetSchema;
exports.payloadSchema = payloadSchema;