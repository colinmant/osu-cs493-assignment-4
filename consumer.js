const sharp = require('sharp')
const { GridFSBucket, ObjectId } = require('mongodb')

const { connectToDb, getDbReference } = require('./lib/mongo')
const { connectToRabbit, getChannel } = require('./lib/rabbit')
const { getPhotoDownloadStreamById } = require('./models/photo')

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

async function generateThumbnail(photoId) {
  const downloadStream = getPhotoDownloadStreamById(photoId)
  const imageBuffer = await streamToBuffer(downloadStream)

  const thumbBuffer = await sharp(imageBuffer)
    .resize(100, 100)
    .jpeg()
    .toBuffer()

  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' })

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(`${photoId}.jpg`, {
      metadata: { contentType: 'image/jpeg' }
    })
    uploadStream.on('error', reject)
    uploadStream.on('finish', async () => {
      const thumbId = uploadStream.id
      await db.collection('photos.files').updateOne(
        { _id: new ObjectId(photoId) },
        { $set: { 'metadata.thumbId': thumbId } }
      )
      resolve(thumbId)
    })
    uploadStream.end(thumbBuffer)
  })
}

connectToDb(async () => {
  await connectToRabbit('photos')
  const channel = getChannel()
  channel.consume('photos', async (msg) => {
    if (msg !== null) {
      const photoId = msg.content.toString()
      console.log(`Processing thumbnail for photo ${photoId}`)
      try {
        await generateThumbnail(photoId)
        channel.ack(msg)
      } catch (err) {
        console.error(err)
        channel.nack(msg)
      }
    }
  })
})
