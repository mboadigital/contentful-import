import { resolve } from 'path'

import moment from 'moment'

import { version } from '../package'
import { getHeadersConfig } from './utils/headers'
import { proxyStringToObject, agentFromProxy } from 'contentful-batch-libs/dist/proxy'

const SUPPORTED_ENTITY_TYPES = [
  'contentTypes',
  'tags',
  'entries',
  'assets',
  'locales',
  'webhooks',
  'editorInterfaces'
]

export default function parseOptions (params, contentParse) {
  const defaultOptions = {
    skipContentModel: false,
    skipLocales: false,
    skipContentPublishing: false,
    useVerboseRenderer: false,
    environmentId: 'master',
    rawProxy: false,
    uploadAssets: false,
    rateLimit: 7
  }

  const configFile = params.config
    ? require(resolve(process.cwd(), params.config))
    : {}

  const options = {
    ...defaultOptions,
    ...configFile,
    ...params,
    headers: params.headers || getHeadersConfig(params.header)
  }

  // Validation
  if (!options.spaceId) {
    throw new Error('The `spaceId` option is required.')
  }

  if (!options.managementToken) {
    throw new Error('The `managementToken` option is required.')
  }

  if (options.contentModelOnly && options.skipContentModel) {
    throw new Error('`contentModelOnly` and `skipContentModel` cannot be used together')
  }

  if (options.skipLocales && !options.contentModelOnly) {
    throw new Error('`skipLocales` can only be used together with `contentModelOnly`')
  }

  if (!options.awsAccessKey || !options.awsSecret) {
    throw new Error('AWS Credentials is not setup please provide `awsAccessKey` or `awsSecret`')
  }

  if (!options.awsBucket) {
    throw new Error('The `awsBucket` option is required')
  }

  if (!options.folderName) {
    throw new Error('The `folderName` option is required')
  }

  const proxySimpleExp = /.+:\d+/
  const proxyAuthExp = /.+:.+@.+:\d+/
  if (typeof options.proxy === 'string' && options.proxy && !(proxySimpleExp.test(options.proxy) || proxyAuthExp.test(options.proxy))) {
    throw new Error('Please provide the proxy config in the following format:\nhost:port or user:password@host:port')
  }

  options.startTime = moment()

  if (!options.errorLogFile) {
    options.errorLogFile = resolve(process.cwd(), `contentful-import-error-log-${options.spaceId}-${options.startTime.format('YYYY-MM-DDTHH-mm-SS')}.json`)
  } else {
    options.errorLogFile = resolve(process.cwd(), options.errorLogFile)
  }

  // Further processing
  options.accessToken = options.managementToken

  if (contentParse) {
    if (!options.content) {
      throw new Error('Either the `contentFile` or `content` option are required.')
    }

    // Clean up content to only include supported entity types
    Object.keys(options.content).forEach((type) => {
      if (SUPPORTED_ENTITY_TYPES.indexOf(type) === -1) {
        delete options.content[type]
      }
    })

    SUPPORTED_ENTITY_TYPES.forEach((type) => {
      options.content[type] = options.content[type] || []
    })
  }

  if (typeof options.proxy === 'string') {
    options.proxy = proxyStringToObject(options.proxy)
  }

  if (!options.rawProxy && options.proxy) {
    options.httpsAgent = agentFromProxy(options.proxy)
    delete options.proxy
  }

  options.application = options.managementApplication || `contentful.import/${version}`
  options.feature = options.managementFeature || 'library-import'
  return options
}
