'use strict';

const config = require('../config');
const { unauthorizedError } = require('../utils/errors');

function authenticate(req, _res, next) {
  const header = req.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return next(unauthorizedError('Missing or malformed Authorization header'));
  }
  const token = match[1].trim();
  const principal = config.auth.demoTokens.get(token);
  if (!principal) {
    return next(unauthorizedError('Invalid token'));
  }
  req.principal = principal;
  return next();
}

module.exports = { authenticate };
