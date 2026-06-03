/*
 * Photo schema and data accessor methods.
 */

const { ObjectId, GridFSBucket } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  businessId: { required: true },
  caption: { required: false }
}

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

exports.PhotoSchema = PhotoSchema
exports.imageTypes = imageTypes

/*
 * Executes a DB query to insert a new photo into the database.  Returns
 * a Promise that resolves to the ID of the newly-created photo entry.
 */
async function insertNewPhoto(photo, file) {
  photo = extractValidFields(photo, PhotoSchema)
  photo.businessId = ObjectId(photo.businessId)
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: {
        contentType: file.mimetype,
        businessId: photo.businessId,
        caption: photo.caption
      }
    })
    uploadStream.on('error', reject)
    uploadStream.on('finish', () => resolve(uploadStream.id))
    uploadStream.end(file.buffer)
  })
}
exports.insertNewPhoto = insertNewPhoto

/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
  if (!ObjectId.isValid(id)) return null
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const results = await bucket.find({ _id: new ObjectId(id) }).toArray()
  const file = results[0]
  if (!file) return null
  const ext = imageTypes[file.metadata.contentType]

  return {
    _id: file._id,
    businessId: file.metadata.businessId,
    caption: file.metadata.caption,
    contentType: file.metadata.contentType,
    url: `/media/photos/${file._id}.${ext}`,
    thumbUrl: `/media/thumbs/${id}.jpg`

  }
}
exports.getPhotoById = getPhotoById

function getPhotoDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  return bucket.openDownloadStream(new ObjectId(id))
}

exports.getPhotoDownloadStreamById = getPhotoDownloadStreamById

function getThumbDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' })
  return bucket.openDownloadStreamByName(`${id}.jpg`)
}
exports.getThumbDownloadStreamById = getThumbDownloadStreamById