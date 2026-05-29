'use strict';

const config = require('./config');
const { createApp } = require('./app');

const app = createApp();
app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});
