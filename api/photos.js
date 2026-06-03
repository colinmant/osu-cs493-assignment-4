/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
const multer = require('multer')

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  insertNewPhoto,
  getPhotoById,
  imageTypes
} = require('../models/photo')

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (imageTypes[file.mimetype]) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  }
})

/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "Invalid file type." })
  }
  if (validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const id = await insertNewPhoto(req.body, req.file)
      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoById(req.params.id)
    if (photo) {
      res.status(200).send(photo)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

module.exports = router
