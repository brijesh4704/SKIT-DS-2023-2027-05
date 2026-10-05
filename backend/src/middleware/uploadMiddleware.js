const upload = {
  fields: () => (req, res, next) => next() // Dummy middleware for testing without multer
};

module.exports = { upload };
