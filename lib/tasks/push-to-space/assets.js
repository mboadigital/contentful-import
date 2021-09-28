import fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

import getEntityName from 'contentful-batch-libs/dist/get-entity-name'
import { logEmitter } from 'contentful-batch-libs/dist/logging'

const stat = promisify(fs.stat)

export async function getAssetStreamForURL (url, assetsDirectory) {
  const [, assetPath] = url.split('//')
  const filePath = join(assetsDirectory, assetPath)
  try {
    await stat(filePath)
    return fs.createReadStream(filePath)
  } catch (err) {
    const error = new Error('Cannot open asset from filesystem')
    error.filePath = filePath
    throw error
  }
}

export function getFileFromAWS (s3Client, url, bucketName, path, toJson) {
  return new Promise((resolve, reject) => {
    const [, assetPath] = url.split('//')
    const key = path + '/' + assetPath
    const params = {
      Bucket: bucketName,
      Key: key
    }
    s3Client.getObject(params, (err, data) => {
      if (err) {
        reject(err)
      }
      if (toJson) {
        const buffer = data && data.Body ? data.Body.toString() : null
        const json = buffer ? JSON.parse(buffer) : null
        resolve(json)
      }
      const result = data ? data.Body : null
      resolve(result)
    })
  })
}

export async function getFileStreamFromAWS (s3Client, url, bucketName, path) {
  const [, assetPath] = url.split('//')
  const key = path + '/' + assetPath
  const params = {
    Bucket: bucketName,
    Key: key
  }
  return s3Client.getObject(params).createReadStream()
}

export async function processAssets ({ assets, timeout, retryLimit, requestQueue }) {
  const pendingProcessingAssets = assets.map((asset) => {
    return requestQueue.add(async () => {
      logEmitter.emit('info', `Processing Asset ${getEntityName(asset)}`)
      const processingOptions = Object.assign(
        {},
        timeout && { processingCheckWait: timeout },
        retryLimit && { processingCheckRetry: retryLimit }
      )

      try {
        const processedAsset = await asset.processForAllLocales(processingOptions)
        return processedAsset
      } catch (err) {
        err.entity = asset
        logEmitter.emit('error', err)
        return null
      }
    })
  })

  const potentiallyProcessedAssets = await Promise.all(pendingProcessingAssets)

  return potentiallyProcessedAssets.filter((asset) => asset)
}
