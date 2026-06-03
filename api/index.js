const { Router } = require('express')

const router = Router()
const { getPhotoDownloadStreamById } = require('../models/photo')

router.use('/businesses', require('./businesses'))
router.use('/photos', require('./photos'))
router.get('/media/photos/:id.:ext', async (req, res, next) => {
    try {
        const stream = getPhotoDownloadStreamById(req.params.id)
        stream.on('error', () => next())
        stream.on('file', (file) => {
            res.setHeader('Content-Type', file.metadata.contentType)
        })
        stream.pipe(res)
    } catch (err) {
        next(err)
    }
})

module.exports = router
