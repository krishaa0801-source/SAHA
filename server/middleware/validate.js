const { validationResult } = require('express-validator');

// Runs after a chain of express-validator checks. Collapses its result
// down to the same { error: string } shape every route in this app
// already returns, instead of express-validator's own array format.
function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const first = result.array({ onlyFirstError: true })[0];
  res.status(400).json({ error: first.msg });
}

module.exports = handleValidationErrors;
